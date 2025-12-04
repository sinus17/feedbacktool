export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-2xl w-full text-center">
        {/* GIF */}
        <div className="mb-8">
          <img
            src="https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUyZmdvYzl3aGRtZ24yMHVjZHppa2hraG9jOWo2cXF6YnM4OHAwYW85bCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/6uGhT1O4sxpi8/giphy.gif"
            alt="404 - Not Found"
            className="mx-auto rounded-lg shadow-2xl max-w-md w-full"
          />
        </div>

        {/* 404 Text */}
        <h1 className="text-8xl font-bold text-white mb-4">404</h1>
        <h2 className="text-3xl font-semibold text-gray-300 mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-400 text-lg">
          Oops! The page you're looking for doesn't exist.
        </p>
      </div>
    </div>
  );
}
