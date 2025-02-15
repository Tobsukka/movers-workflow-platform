import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create test employer
  const testEmployer = await prisma.user.upsert({
    where: { email: 'yritys@muuttopalvelu.fi' },
    update: {},
    create: {
      email: 'yritys@muuttopalvelu.fi',
      name: 'Muuttopalvelu Oy',
      password: await bcrypt.hash('password123', 12),
      role: 'EMPLOYER',
      verified: true,
      phone: '040 1234567',
      address: 'Mannerheimintie 10, 00100 Helsinki',
    },
  });

  // Create test employees
  const employees = await Promise.all([
    prisma.user.upsert({
      where: { email: 'matti@muuttopalvelu.fi' },
      update: {},
      create: {
        email: 'matti@muuttopalvelu.fi',
        name: 'Matti Virtanen',
        password: await bcrypt.hash('password123', 12),
        role: 'EMPLOYEE',
        verified: true,
        phone: '040 2345678',
        address: 'Töölönkatu 15, 00100 Helsinki',
      },
    }),
    prisma.user.upsert({
      where: { email: 'liisa@muuttopalvelu.fi' },
      update: {},
      create: {
        email: 'liisa@muuttopalvelu.fi',
        name: 'Liisa Korhonen',
        password: await bcrypt.hash('password123', 12),
        role: 'EMPLOYEE',
        verified: true,
        phone: '040 3456789',
        address: 'Fredrikinkatu 20, 00120 Helsinki',
      },
    }),
    prisma.user.upsert({
      where: { email: 'mikko@muuttopalvelu.fi' },
      update: {},
      create: {
        email: 'mikko@muuttopalvelu.fi',
        name: 'Mikko Nieminen',
        password: await bcrypt.hash('password123', 12),
        role: 'EMPLOYEE',
        verified: false,
        phone: '040 4567890',
        address: 'Hämeentie 25, 00500 Helsinki',
      },
    }),
  ]);

  // Create test jobs
  const jobs = await Promise.all([
    prisma.job.create({
      data: {
        title: 'Kerrostalomuutto Kalliossa',
        description: 'Kahden hengen asunnon muutto kolmannesta kerroksesta, hissi käytettävissä.',
        status: 'AVAILABLE',
        pickupLocation: 'Fleminginkatu 15, 00530 Helsinki',
        deliveryLocation: 'Helsinginkatu 8, 00500 Helsinki',
        date: new Date('2024-03-01T09:00:00Z'),
        estimatedHours: 4,
        numberOfMovers: 2,
        items: ['Sohva', 'Sänky', 'Ruokapöytä', 'Kirjahylly', 'Noin 20 muuttolaatikkoa'],
        specialRequirements: 'Piano kuljetettava varovasti',
        customerName: 'Anna Mäkelä',
        customerPhone: '040 5678901',
        customerEmail: 'anna.makela@email.fi',
        floorNumber: 3,
        hasElevator: true,
        price: 480,
      },
    }),
    prisma.job.create({
      data: {
        title: 'Omakotitalomuutto Espoossa',
        description: 'Suuri omakotitalomuutto, paljon huonekaluja ja kodinelektroniikkaa.',
        status: 'ASSIGNED',
        pickupLocation: 'Niittykatu 8, 02200 Espoo',
        deliveryLocation: 'Puistotie 12, 02100 Espoo',
        date: new Date('2024-03-05T08:00:00Z'),
        estimatedHours: 8,
        numberOfMovers: 3,
        items: ['Sohvakalusto', 'Ruokailuryhmä', '2 sänkyä', 'Pesukone', 'Kuivausrumpu', 'Noin 40 muuttolaatikkoa'],
        customerName: 'Juha Järvinen',
        customerPhone: '040 6789012',
        customerEmail: 'juha.jarvinen@email.fi',
        floorNumber: 1,
        hasElevator: false,
        price: 960,
        employees: {
          connect: [
            { id: employees[0].id },
            { id: employees[1].id },
          ],
        },
      },
    }),
    prisma.job.create({
      data: {
        title: 'Toimistomuutto Ruoholahdessa',
        description: 'Pienen toimiston muutto, pääasiassa toimistokalusteita ja IT-laitteita.',
        status: 'COMPLETED',
        pickupLocation: 'Itämerenkatu 5, 00180 Helsinki',
        deliveryLocation: 'Porkkalankatu 20, 00180 Helsinki',
        date: new Date('2024-02-15T07:00:00Z'),
        estimatedHours: 6,
        numberOfMovers: 2,
        items: ['10 työpöytää', '10 työtuolia', '5 kaappia', 'Verkkolaitteet', 'Tietokoneet ja näytöt'],
        specialRequirements: 'IT-laitteet pakattava erityisen huolellisesti',
        customerName: 'Tech Oy',
        customerPhone: '09 1234567',
        customerEmail: 'muutto@techoy.fi',
        floorNumber: 4,
        hasElevator: true,
        price: 720,
        employees: {
          connect: [
            { id: employees[0].id },
          ],
        },
      },
    }),
  ]);

  console.log({ testEmployer, employees, jobs });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  }); 