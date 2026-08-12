"use client";

import { useState } from "react";
import { useBank } from "@/hooks/useBank";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Check, CreditCard, Building, Smartphone } from "lucide-react";
import toast from "react-hot-toast";

const PLANS = [
  { id: "basic", name: "Basic", price: 500, features: ["Up to 5 Users", "Basic Analytics", "Standard Support"] },
  { id: "pro", name: "Pro", price: 1000, features: ["Up to 20 Users", "Advanced Analytics", "Priority Support"] },
  { id: "enterprise", name: "Enterprise", price: 5000, features: ["Unlimited Users", "Custom Reports", "24/7 Dedicated Support"] }
];

const GATEWAYS = [
  { id: "stripe", name: "Credit/Debit Card", icon: CreditCard, color: "text-blue-500" },
  { id: "bkash", name: "bKash", icon: Smartphone, color: "text-pink-500" },
  { id: "sslcommerz", name: "SSLCommerz", icon: Building, color: "text-orange-500" },
  { id: "uddoktapay", name: "Uddokta Pay", icon: Smartphone, color: "text-green-500" }
];

export default function BillingPage() {
  const { bank, loading } = useBank();
  const [selectedPlan, setSelectedPlan] = useState("basic");
  const [selectedGateway, setSelectedGateway] = useState("bkash");
  const [processing, setProcessing] = useState(false);

  if (loading) return <LoadingSpinner />;
  if (!bank) return <div className="p-8 text-center text-[var(--color-text-muted)]">Please select a bank to manage billing.</div>;

  const handleCheckout = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankId: bank.id,
          planId: selectedPlan,
          gateway: selectedGateway
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");

      // Redirect to payment gateway
      window.location.href = data.url;
    } catch (err) {
      toast.error(err.message || "Failed to initiate payment");
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Billing & Subscription</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Manage your plan and billing method</p>
      </div>

      <div className="bg-[var(--color-surface)] border border-border p-4 rounded-xl shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-medium text-[var(--color-text)]">Current Status</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            {bank.subscriptionStatus === 'active' ? (
              <span className="text-green-500 font-medium capitalize">{bank.subscriptionPlan} Plan (Active)</span>
            ) : (
              <span className="text-amber-500 font-medium">Free Tier / Inactive</span>
            )}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <Card 
            key={plan.id} 
            className={`cursor-pointer transition-all ${selectedPlan === plan.id ? 'ring-2 ring-primary border-transparent' : 'hover:border-primary/50'}`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription className="text-2xl font-bold text-[var(--color-text)]">
                ৳{plan.price}<span className="text-sm font-normal text-[var(--color-text-muted)]">/mo</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center text-sm text-[var(--color-text-muted)]">
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-[var(--color-text)]">Select Payment Method</h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {GATEWAYS.map((gw) => (
            <div 
              key={gw.id}
              onClick={() => setSelectedGateway(gw.id)}
              className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 cursor-pointer transition-all
                ${selectedGateway === gw.id ? 'bg-primary/5 border-primary' : 'border-border bg-surface hover:bg-[var(--color-background)]'}`}
            >
              <gw.icon className={`h-8 w-8 ${gw.color}`} />
              <span className={`text-sm font-medium ${selectedGateway === gw.id ? 'text-primary' : 'text-[var(--color-text)]'}`}>
                {gw.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <Button size="lg" onClick={handleCheckout} disabled={processing}>
          {processing ? "Processing..." : `Pay ৳${PLANS.find(p => p.id === selectedPlan)?.price} via ${GATEWAYS.find(g => g.id === selectedGateway)?.name}`}
        </Button>
      </div>
    </div>
  );
}
