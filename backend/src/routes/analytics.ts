import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { protect, restrictTo, ensureAuth } from '../middleware/auth';
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

// Add type definition for weekly shifts query result
interface WeeklyShiftResult {
  date: Date;
  shifts: bigint;
  revenue: number | null;
}

const router = Router();
const prisma = new PrismaClient();

// Get analytics data
router.get('/', protect, restrictTo('EMPLOYER', 'ADMIN'), async (req, res, next) => {
  try {
    const user = ensureAuth(req);
    const timeRange = req.query.timeRange as string || '30D';
    const now = new Date();
    let startDate = new Date();

    // Calculate start date based on time range
    switch (timeRange) {
      case '7D':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30D':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90D':
        startDate.setDate(now.getDate() - 90);
        break;
      case 'ALL':
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get total stats
    const [
      totalEmployees,
      activeJobs,
      completedJobs,
      upcomingShifts,
      totalRevenue,
    ] = await Promise.all([
      prisma.user.count({
        where: {
          role: 'EMPLOYEE',
          verified: true,
        },
      }),
      prisma.job.count({
        where: {
          status: {
            in: ['AVAILABLE', 'ASSIGNED', 'IN_PROGRESS'],
          },
          date: {
            gte: startDate,
          },
        },
      }),
      prisma.job.count({
        where: {
          status: 'COMPLETED',
          date: {
            gte: startDate,
          },
        },
      }),
      prisma.shift.count({
        where: {
          startTime: {
            gte: new Date(),
          },
          status: 'SCHEDULED',
        },
      }),
      prisma.job.aggregate({
        where: {
          status: 'COMPLETED',
          date: {
            gte: startDate,
          },
        },
        _sum: {
          price: true,
        },
      }),
    ]);

    // Get job status distribution
    const jobStatusDistribution = await prisma.job.groupBy({
      by: ['status'],
      where: {
        date: {
          gte: startDate,
        },
      },
      _count: true,
    });

    // Get employee performance
    const employeePerformance = await prisma.user.findMany({
      where: {
        role: 'EMPLOYEE',
        verified: true,
      },
      select: {
        name: true,
        _count: {
          select: {
            jobs: {
              where: {
                status: 'COMPLETED',
                date: {
                  gte: startDate,
                },
              },
            },
          },
        },
      },
      take: 10, // Limit to top 10 employees
    });

    // Get weekly shifts and revenue
    const weeklyShifts = await prisma.$queryRaw<WeeklyShiftResult[]>`
      SELECT 
        DATE_TRUNC('day', "startTime") as date,
        COUNT(*)::integer as shifts,
        COALESCE(SUM(j.price), 0)::float as revenue
      FROM "Shift" s
      LEFT JOIN "Job" j ON j.status = 'COMPLETED'
      WHERE s."startTime" >= ${startDate}
      GROUP BY DATE_TRUNC('day', "startTime")
      ORDER BY date ASC
    `;

    // Convert BigInt values to numbers in the response
    const formattedWeeklyShifts = weeklyShifts.map((entry) => ({
      date: entry.date,
      shifts: Number(entry.shifts),
      revenue: Number(entry.revenue || 0),
    }));

    const formattedJobStatusDistribution = jobStatusDistribution.map((item) => ({
      status: item.status,
      count: Number(item._count),
    }));

    const formattedEmployeePerformance = employeePerformance.map((emp) => ({
      name: emp.name,
      completedJobs: Number(emp._count.jobs),
      rating: Math.random() * 2 + 3, // Mock rating between 3-5
    }));

    // Calculate average job price
    const averageJobPrice = totalRevenue._sum.price
      ? Math.round(totalRevenue._sum.price / completedJobs)
      : 0;

    // Calculate employee utilization
    const employeeUtilization = Math.round(
      (activeJobs / (totalEmployees || 1)) * 100
    );

    res.status(200).json({
      status: 'success',
      data: {
        totalStats: {
          totalEmployees: Number(totalEmployees),
          activeJobs: Number(activeJobs),
          completedJobs: Number(completedJobs),
          upcomingShifts: Number(upcomingShifts),
          totalRevenue: Number(totalRevenue._sum.price || 0),
          averageJobPrice: Number(averageJobPrice),
          employeeUtilization: Number(employeeUtilization),
        },
        jobStatusDistribution: formattedJobStatusDistribution,
        employeePerformance: formattedEmployeePerformance,
        weeklyShifts: formattedWeeklyShifts,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get dashboard statistics
router.get('/dashboard', protect, async (req, res, next) => {
  try {
    const user = ensureAuth(req);
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);

    if (user.role === 'EMPLOYER') {
      // Get employer dashboard stats
      const [
        activeEmployees,
        activeJobs,
        todayShifts,
        pendingApprovals,
        recentActivity,
        upcomingJobs
      ] = await Promise.all([
        // Count active employees
        prisma.user.count({
          where: {
            role: 'EMPLOYEE',
            verified: true,
          },
        }),

        // Count active jobs
        prisma.job.count({
          where: {
            status: 'IN_PROGRESS',
          },
        }),

        // Count today's shifts
        prisma.shift.count({
          where: {
            startTime: {
              gte: startOfToday,
              lte: endOfToday,
            },
          },
        }),

        // Count pending employee approvals
        prisma.user.count({
          where: {
            role: 'EMPLOYEE',
            verified: false,
          },
        }),

        // Get recent activity
        prisma.job.findMany({
          where: {
            OR: [
              { status: 'COMPLETED' },
              { status: 'ASSIGNED' },
            ],
          },
          orderBy: {
            updatedAt: 'desc',
          },
          take: 5,
          select: {
            id: true,
            title: true,
            status: true,
            updatedAt: true,
          },
        }),

        // Get upcoming jobs
        prisma.job.findMany({
          where: {
            date: {
              gte: today,
            },
            status: 'ASSIGNED',
          },
          orderBy: {
            date: 'asc',
          },
          take: 5,
          select: {
            id: true,
            title: true,
            date: true,
            pickupLocation: true,
          },
        }),
      ]);

      // Format recent activity
      const formattedActivity = recentActivity.map((activity) => ({
        id: activity.id,
        type: activity.status === 'COMPLETED' ? 'JOB_COMPLETED' : 'JOB_ASSIGNED',
        message: activity.status === 'COMPLETED'
          ? `Job "${activity.title}" was completed`
          : `Job "${activity.title}" was assigned`,
        timestamp: activity.updatedAt,
      }));

      res.status(200).json({
        status: 'success',
        data: {
          activeEmployees,
          activeJobs,
          todayShifts,
          pendingApprovals,
          recentActivity: formattedActivity,
          upcomingJobs: upcomingJobs.map(job => ({
            id: job.id,
            title: job.title,
            date: job.date,
            location: job.pickupLocation,
          })),
        },
      });
    } else {
      // Get employee dashboard stats
      const [
        todayShifts,
        assignedJobs,
        weeklyHours,
        upcomingShifts,
        availableJobs
      ] = await Promise.all([
        // Count today's shifts
        prisma.shift.count({
          where: {
            employeeId: user.id,
            startTime: {
              gte: startOfToday,
              lte: endOfToday,
            },
          },
        }),

        // Count assigned jobs
        prisma.job.count({
          where: {
            status: 'ASSIGNED',
            employees: {
              some: {
                id: user.id,
              },
            },
          },
        }),

        // Calculate hours this week
        prisma.shift.findMany({
          where: {
            employeeId: user.id,
            startTime: {
              gte: weekStart,
              lte: weekEnd,
            },
            status: 'COMPLETED',
          },
          select: {
            startTime: true,
            endTime: true,
            breakMinutes: true,
          },
        }),

        // Get upcoming shifts
        prisma.shift.findMany({
          where: {
            employeeId: user.id,
            startTime: {
              gte: today,
            },
            status: 'SCHEDULED',
          },
          orderBy: {
            startTime: 'asc',
          },
          take: 5,
          select: {
            id: true,
            startTime: true,
            endTime: true,
            job: {
              select: {
                title: true,
                pickupLocation: true,
              },
            },
          },
        }),

        // Get available jobs
        prisma.job.findMany({
          where: {
            status: 'AVAILABLE',
            date: {
              gte: today,
            },
          },
          orderBy: {
            date: 'asc',
          },
          take: 5,
          select: {
            id: true,
            title: true,
            date: true,
            pickupLocation: true,
            price: true,
          },
        }),
      ]);

      // Calculate total hours worked this week
      const hoursThisWeek = weeklyHours.reduce((total, shift) => {
        const duration = (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60);
        const breakHours = shift.breakMinutes / 60;
        return total + (duration - breakHours);
      }, 0);

      res.status(200).json({
        status: 'success',
        data: {
          todayShifts,
          assignedJobs,
          hoursThisWeek: Math.round(hoursThisWeek * 10) / 10, // Round to 1 decimal place
          upcomingShifts: upcomingShifts.map(shift => ({
            id: shift.id,
            startTime: shift.startTime,
            endTime: shift.endTime,
            job: {
              title: shift.job.title,
              location: shift.job.pickupLocation,
            },
          })),
          availableJobs: availableJobs.map(job => ({
            id: job.id,
            title: job.title,
            date: job.date,
            location: job.pickupLocation,
            price: job.price,
          })),
        },
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router; 