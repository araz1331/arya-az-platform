import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="page-terms">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { window.location.href = "/"; }} data-testid="button-terms-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Shield className="w-5 h-5 text-foreground" />
          <h1 className="font-semibold text-lg" data-testid="text-terms-title">Terms of Service</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground" data-testid="text-terms-updated">Last updated: February 20, 2026</p>
          <p className="text-sm text-muted-foreground" data-testid="text-terms-operator">Arya.az — Operated by HireArya LLC</p>
        </div>

        <section className="space-y-3" data-testid="section-acceptance">
          <h2 className="text-xl font-bold">1. Acceptance of Terms</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            By accessing or using Arya.az (the "Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service. The Service includes the Arya.az website, AI receptionist features, Smart Profile pages, voice donation platform, WhatsApp integrations, embeddable widgets, and all related APIs and tools.
          </p>
        </section>

        <section className="space-y-3" data-testid="section-description">
          <h2 className="text-xl font-bold">2. Description of Service</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Arya.az provides AI-powered receptionist and business assistant services. The Service uses artificial intelligence to respond to customer inquiries, manage bookings, and provide business information based on data you provide. The AI is designed to be helpful but is not a substitute for human judgment.
          </p>
        </section>

        <section className="space-y-3" data-testid="section-as-is">
          <h2 className="text-xl font-bold">3. Service Provided "As-Is"</h2>
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm leading-relaxed font-medium">
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We do not guarantee that the Service will be uninterrupted, error-free, or completely secure. The AI may occasionally produce inaccurate, incomplete, or inappropriate responses. You acknowledge that AI-generated content may contain errors and should not be relied upon as the sole basis for business decisions.
          </p>
        </section>

        <section className="space-y-3" data-testid="section-liability">
          <h2 className="text-xl font-bold">4. Limitation of Liability</h2>
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm leading-relaxed font-medium">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ARYA.AZ, ITS OPERATORS, AFFILIATES, AND EMPLOYEES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1" data-testid="list-liability-items">
              <li>Loss of revenue, profits, or business opportunities</li>
              <li>Damages arising from AI-generated responses, including incorrect pricing, availability, or service information ("AI hallucinations")</li>
              <li>Loss of data or business interruption</li>
              <li>Damages resulting from unauthorized access to your account</li>
              <li>Any actions taken by customers based on AI-provided information</li>
            </ul>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You are solely responsible for verifying the accuracy of information provided by the AI to your customers. You agree to review your AI receptionist's responses regularly and update your knowledge base to ensure accuracy.
          </p>
        </section>

        <section className="space-y-3" data-testid="section-responsibilities">
          <h2 className="text-xl font-bold">5. User Responsibilities</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">As a user of the Service, you agree to:</p>
          <ul className="list-disc list-inside text-sm space-y-1.5 text-muted-foreground">
            <li>Provide accurate and up-to-date business information in your knowledge base</li>
            <li>Regularly review and correct AI-generated responses to customers</li>
            <li>Not use the Service for illegal, fraudulent, or deceptive purposes</li>
            <li>Not attempt to manipulate, hack, or exploit the AI system</li>
            <li>Comply with all applicable local, national, and international laws</li>
            <li>Maintain the confidentiality of your account credentials</li>
            <li>Obtain proper consent before collecting customer data through the Service</li>
          </ul>
        </section>

        <section className="space-y-3" data-testid="section-privacy">
          <h2 className="text-xl font-bold">6. Data Privacy & Protection</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We take data protection seriously. Your business data and customer interactions are stored securely. We collect and process the following types of data:
          </p>
          <ul className="list-disc list-inside text-sm space-y-1.5 text-muted-foreground">
            <li><strong>Business Data:</strong> Knowledge base content, profile information, and settings you provide</li>
            <li><strong>Customer Interactions:</strong> Chat messages, booking requests, and contact information submitted through the AI receptionist</li>
            <li><strong>Voice Donations:</strong> Audio recordings voluntarily submitted through the /az platform</li>
            <li><strong>Usage Data:</strong> Analytics and performance metrics</li>
          </ul>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We do not sell your data to third parties. Customer contact information collected through the AI receptionist is shared only with the business owner whose profile the customer interacted with. Data may be processed by third-party AI providers (Google Gemini) for the purpose of generating responses. By using the Service, you consent to this processing.
          </p>
        </section>

        <section className="space-y-3" data-testid="section-ai-disclaimers">
          <h2 className="text-xl font-bold">7. AI-Specific Disclaimers</h2>
          <ul className="list-disc list-inside text-sm space-y-1.5 text-muted-foreground">
            <li>AI responses are generated automatically and may not always be accurate</li>
            <li>The AI may occasionally misunderstand customer inquiries or provide incomplete information</li>
            <li>AI-quoted prices, availability, and service details are based solely on the data you provide and may become outdated</li>
            <li>The AI is not a licensed professional and its responses should not be considered professional advice (legal, medical, financial, etc.)</li>
            <li>You are responsible for monitoring and correcting AI behavior on your profile</li>
          </ul>
        </section>

        <section className="space-y-3" data-testid="section-payments">
          <h2 className="text-xl font-bold">8. Subscription & Payments</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Paid plans (Pro, Agency, Founding Member Pass) are billed through Stripe. Subscriptions auto-renew unless cancelled. Refunds are handled on a case-by-case basis. We reserve the right to change pricing with 30 days' notice to active subscribers.
          </p>
        </section>

        <section className="space-y-3" data-testid="section-termination">
          <h2 className="text-xl font-bold">9. Termination</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We reserve the right to suspend or terminate your account at any time for violation of these terms, abuse of the Service, or non-payment. Upon termination, your data may be deleted after a reasonable retention period. You may request data export before account closure.
          </p>
        </section>

        <section className="space-y-3" data-testid="section-governing-law">
          <h2 className="text-xl font-bold">10. Governing Law</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            These Terms shall be governed by and construed in accordance with the laws of the Republic of Azerbaijan. Any disputes arising from or relating to these Terms shall be subject to the exclusive jurisdiction of the courts of Baku, Azerbaijan.
          </p>
        </section>

        <section className="space-y-3" data-testid="section-changes">
          <h2 className="text-xl font-bold">11. Changes to Terms</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the revised Terms. We will make reasonable efforts to notify users of significant changes.
          </p>
        </section>

        <section className="space-y-3" data-testid="section-contact">
          <h2 className="text-xl font-bold">12. Contact</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            For questions about these Terms, contact us at: <a href="mailto:support@arya.az" className="underline hover:opacity-80" data-testid="link-support-email">support@arya.az</a>
          </p>
        </section>

        <div className="pt-4 border-t text-center">
          <p className="text-xs text-muted-foreground" data-testid="text-copyright">&copy; {new Date().getFullYear()} Arya.az — All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
