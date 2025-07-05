import Link from 'next/link';

export default function ThankYouPage() {
  return (
    <section className="py-16 sm:py-24 bg-[#F3F4F9] min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-primary mb-6">Thank You for Applying!</h1>
        <p className="text-lg text-muted-foreground mb-8">Your application has been successfully submitted.</p>
        <Link href="/" className="inline-block px-6 py-3 text-lg font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">
          Back to Home
        </Link>
      </div>
    </section>
  );
}
