import '../styles.css';

export default function Unauthorized(){
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Unauthorized</h1>
        <p className="mt-2">You do not have permission to view this page.</p>
      </div>
    </div>
  );
}
