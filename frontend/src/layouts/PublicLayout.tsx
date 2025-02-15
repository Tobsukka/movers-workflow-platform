import { Outlet } from 'react-router-dom';

const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold">Moving Company</div>
            <div className="space-x-4">
              <a href="/login/employee" className="text-primary hover:text-primary/80">
                Employee Login
              </a>
              <a href="/login/employer" className="text-primary hover:text-primary/80">
                Employer Login
              </a>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-muted-foreground">
          © {new Date().getFullYear()} Moving Company. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout; 