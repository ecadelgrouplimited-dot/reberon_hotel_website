import { CmsPage, cmsMetadata } from '@/lib/cms-page';

export const revalidate = 60;
export const generateMetadata = () => cmsMetadata('');

export default function Home() {
  return <CmsPage slug="" />;
}
