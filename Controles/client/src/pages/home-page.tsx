import { useAuth } from '@/hooks/use-auth';
import LandingPage from './landing-page';

export default function HomePage() {
  const { user } = useAuth();
  
  return (
    <LandingPage />
  );
}
