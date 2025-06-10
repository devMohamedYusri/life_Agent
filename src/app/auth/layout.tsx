import { ReactNode } from "react";
export default function authLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from purple-900 via-blue-900 to indigo-900">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
            <div className="text-center mb-8">
                <h1 className='text-4xl font-bold text-white mb-2'> LifeAGent</h1>
                <p className="text-gray-300 ">AI-Powered Life Management</p>

            </div>

            <div className="bg-white rounded-lg shadow-xl p-6">
                {children}
            </div>
        </div>
      </div>
    </div>
  );
}
