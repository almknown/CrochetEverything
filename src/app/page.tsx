import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-slate-900/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            🧶 CrochetAI
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/gallery" className="text-slate-300 hover:text-white transition-colors">
              Gallery
            </Link>
            <Link
              href="/generate"
              className="px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity"
            >
              Start Creating
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-sm text-pink-300 mb-8">
            <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
            Text-to-Reality Crochet Engine
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Turn Your Words Into
            <span className="block bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              Mathematically Valid
            </span>
            Crochet Patterns
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
            The first AI that doesn&apos;t hallucinate stitch counts.
            Describe any flat shape, get a pattern that actually works—guaranteed.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/generate"
              className="px-8 py-4 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white text-lg font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-pink-500/25"
            >
              Generate Your First Pattern
            </Link>
            <Link
              href="/gallery"
              className="px-8 py-4 rounded-full border border-white/20 text-white text-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Browse Gallery
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="max-w-6xl mx-auto mt-24 grid md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-2xl mb-4">
              ✓
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">100% Valid Math</h3>
            <p className="text-slate-400">
              AI generates creative concepts. A geometric engine handles the stitch calculations.
              Every pattern is mathematically guaranteed to work.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-2xl mb-4">
              🔮
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">3D Preview</h3>
            <p className="text-slate-400">
              See exactly what your pattern will produce before you start.
              Interactive 3D view with rotation and zoom.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-2xl mb-4">
              📝
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Ready Instructions</h3>
            <p className="text-slate-400">
              Get professional-grade written patterns with stitch counts,
              materials list, and abbreviations. Export as PDF.
            </p>
          </div>
        </div>

        {/* Shapes Section */}
        <div className="max-w-4xl mx-auto mt-24 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Supported Shapes</h2>
          <p className="text-slate-400 mb-10">Phase 1: Flat pieces. 3D amigurumi coming in Phase 2!</p>

          <div className="flex flex-wrap justify-center gap-4">
            {['Circle', 'Rectangle', 'Triangle', 'Hexagon', 'Oval'].map((shape) => (
              <div
                key={shape}
                className="px-6 py-3 rounded-full bg-white/10 text-white font-medium border border-white/20"
              >
                {shape}
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-5xl mx-auto mt-24">
          <h2 className="text-3xl font-bold text-white text-center mb-12">How It Works</h2>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-pink-500/20 text-pink-400 text-2xl font-bold flex items-center justify-center mx-auto mb-4">1</div>
              <h4 className="text-white font-semibold mb-2">Describe</h4>
              <p className="text-sm text-slate-400">&quot;Make me a cozy round coaster for my coffee mug&quot;</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 text-purple-400 text-2xl font-bold flex items-center justify-center mx-auto mb-4">2</div>
              <h4 className="text-white font-semibold mb-2">AI Designs</h4>
              <p className="text-sm text-slate-400">Gemini AI creates the creative concept and colors</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 text-blue-400 text-2xl font-bold flex items-center justify-center mx-auto mb-4">3</div>
              <h4 className="text-white font-semibold mb-2">Math Engine</h4>
              <p className="text-sm text-slate-400">Geometric algorithms calculate valid stitch patterns</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 text-2xl font-bold flex items-center justify-center mx-auto mb-4">4</div>
              <h4 className="text-white font-semibold mb-2">Create!</h4>
              <p className="text-sm text-slate-400">Get your pattern with 3D preview and written instructions</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400 text-sm">
          <p>© 2026 CrochetAI. Built with ❤️ for fiber artists.</p>
          <p>Phase 1: Flat Shapes | Phase 2: 3D Amigurumi (Coming Soon)</p>
        </div>
      </footer>
    </div>
  );
}
