"use client";

import { Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnableFeatureModalProps {
  featureName: string;
  description?: string;
  onClose: () => void;
}

export function EnableFeatureModal({ featureName, description, onClose }: EnableFeatureModalProps) {
  const mailtoSubject = encodeURIComponent(`AI SENTINEL Premium: ${featureName}`);
  const mailtoBody = encodeURIComponent(
    `Hi,\n\nI'm interested in enabling the "${featureName}" feature for my AI SENTINEL account.\n\nPlease let me know how to proceed.\n\nThank you`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="card-brutal w-full max-w-md mx-4 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-16 h-16 bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Premium Feature</h2>
          <p className="text-muted-foreground mb-1">{featureName}</p>
          {description && (
            <p className="text-sm text-muted-foreground mb-6">{description}</p>
          )}
          <p className="text-2xl font-bold text-primary mb-6">EUR 9/mo</p>

          <div className="space-y-3">
            <a
              href={`mailto:hello@todo.law?subject=${mailtoSubject}&body=${mailtoBody}`}
              className="btn-brutal w-full inline-block text-center"
            >
              Contact Us to Enable
            </a>
            <Button variant="ghost" onClick={onClose} className="w-full">
              Maybe Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
