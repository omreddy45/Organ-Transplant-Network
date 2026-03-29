import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-900 p-4">
      <h1 className="text-4xl font-bold mb-4 text-center dark:text-white">Organ Donation and Transplant Network</h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-8 max-w-md text-center">
        Welcome to the Organ Donation and Procurement Network Management System.
      </p>

      <div className="flex gap-4">
        <Link 
          href="/login" 
          className="px-6 py-3 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg hover:opacity-90 transition-opacity"
        >
          Login
        </Link>
        <Link 
          href="/signup" 
          className="px-6 py-3 border border-zinc-200 dark:border-zinc-700 dark:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
}
