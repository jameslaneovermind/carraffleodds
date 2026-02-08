import { Badge } from '@/components/ui/badge';

interface SiteBadgeProps {
  siteName: string;
}

export function SiteBadge({ siteName }: SiteBadgeProps) {
  return (
    <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 h-5 text-slate-500 border-slate-200">
      {siteName}
    </Badge>
  );
}
