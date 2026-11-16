import { HomeFinder } from '@/components/home-finder';
import { usingFixtures } from '@/lib/config';
import { examplePair } from '@/lib/example-pair';

export default function HomePage() {
  return <HomeFinder demo={usingFixtures()} example={examplePair()} />;
}
