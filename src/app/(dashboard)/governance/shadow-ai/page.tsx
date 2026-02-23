"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Lock } from "lucide-react";
import { EnableFeatureModal } from "@/components/premium/enable-feature-modal";

export default function ShadowAIPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="w-6 h-6 text-primary" />
            Shadow AI Discovery
            <Badge className="bg-primary/20 text-primary">Premium</Badge>
          </h1>
          <p className="text-muted-foreground">Discover unauthorized AI tools, self-reporting portal & policy engine</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-primary/20 flex items-center justify-center mx-auto rounded-lg">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Premium Feature</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Shadow AI Discovery helps you identify unauthorized AI tools across your organization with automated scanning, a self-reporting portal, and policy enforcement.
          </p>
          <Button onClick={() => setShowModal(true)} className="mt-4">
            <Lock className="w-4 h-4 mr-2" />
            Enable Shadow AI Discovery
          </Button>
        </CardContent>
      </Card>

      {showModal && (
        <EnableFeatureModal
          featureName="Shadow AI Discovery"
          description="Discover unauthorized AI tools, manage an AI tool catalog, and enforce AI usage policies across your organization."
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
