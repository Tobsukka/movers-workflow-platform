import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
      <h1 className="text-7xl font-bold">404</h1>
      <p className="mt-4 text-xl text-muted-foreground">
        Oops! The page you're looking for doesn't exist.
      </p>
      <Button asChild className="mt-8">
        <Link to="/">Return Home</Link>
      </Button>
    </div>
  );
} 