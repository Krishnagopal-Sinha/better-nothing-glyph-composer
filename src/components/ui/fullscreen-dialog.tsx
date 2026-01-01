import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FullscreenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  zIndex?: number;
}

/**
 * Reusable fullscreen dialog component
 * Provides consistent styling and structure for fullscreen dialogs
 */
export default function FullscreenDialog({
  isOpen,
  onClose,
  title,
  children,
  zIndex = 50
}: FullscreenDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex }}
    >
      <div className="bg-black border border-white/20 rounded-lg p-6 max-w-[95vw] w-full max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white font-[ndot] tracking-wider uppercase">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

