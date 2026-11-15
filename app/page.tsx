import { HomeFinder } from '@/components/home-finder';
import { usingFixtures } from '@/lib/config';

export default function HomePage() {
  return <HomeFinder demo={usingFixtures()} />;
}
