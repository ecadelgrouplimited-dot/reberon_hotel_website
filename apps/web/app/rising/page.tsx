import { CmsPage, cmsMetadata } from '@/lib/cms-page';

export const revalidate = 3600;
export const generateMetadata = () => cmsMetadata('rising');

export default function Page() {
  return <CmsPage slug="rising" />;
}
