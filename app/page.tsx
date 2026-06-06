import { BrandBrainGenerator } from "../components/BrandBrainGenerator";
import { getBrandDataBundle } from "../lib/brand-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getBrandDataBundle();

  return <BrandBrainGenerator data={data} />;
}
