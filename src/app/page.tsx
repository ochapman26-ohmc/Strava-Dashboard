import Link from "next/link";
import { Nav } from "@/components/Nav";
import { ConnectGarminForm } from "@/components/ConnectGarminForm";

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <section className="max-w-6xl mx-auto px-4 py-24 text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Train smarter with{" "}
            <span className="gradient-text">AI coaching</span>
          </h1>
          <p className="text-lg text-muted max-w-2xl mx-auto mb-10">
            Connect your Garmin Connect account, set training goals, and get
            personalized feedback from an AI coach that understands your
            performance data.
          </p>
          <div className="mb-12 flex gap-4 justify-center">
            <Link href="#connect" className="btn-primary text-lg px-8 py-3">
              Connect Garmin
            </Link>
            <Link href="#features" className="btn-secondary text-lg px-8 py-3">
              Learn More
            </Link>
          </div>
          <div id="connect">
            <ConnectGarminForm />
          </div>
        </section>

        <section id="features" className="max-w-6xl mx-auto px-4 py-20">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="card p-6">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4 text-lg">
                📊
              </div>
              <h3 className="font-semibold text-lg mb-2">Garmin Sync</h3>
              <p className="text-sm text-muted">
                Sync your runs, rides, and workouts from Garmin Connect without
                paid API access. View stats, pace trends, and heart rate data in
                one place.
              </p>
            </div>
            <div className="card p-6">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4 text-lg">
                🎯
              </div>
              <h3 className="font-semibold text-lg mb-2">Goal Tracking</h3>
              <p className="text-sm text-muted">
                Set weekly distance targets, monthly activity counts, and more.
                Progress updates automatically from your Garmin activity data.
              </p>
            </div>
            <div className="card p-6">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4 text-lg">
                🤖
              </div>
              <h3 className="font-semibold text-lg mb-2">AI Coach</h3>
              <p className="text-sm text-muted">
                Get personalized training advice, weekly reviews, and feedback
                based on your actual performance and goals.
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to level up?</h2>
          <p className="text-muted mb-8">
            Connect your Garmin account in seconds and start getting coaching
            feedback right away.
          </p>
          <Link href="#connect" className="btn-primary text-lg px-8 py-3">
            Get Started Free
          </Link>
        </section>
      </main>
    </>
  );
}
