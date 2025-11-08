import '../styles.css';

export default function NotFound(){
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold">404 — Not Found</h1>
        <p className="mt-2">The page you're looking for does not exist.</p>
      </div>
    </div>
  );
}
