
import React, { useState } from 'react';

interface LoginExperienceProps {
  onLogin: (name: string) => void;
}

const LoginExperience: React.FC<LoginExperienceProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [isExiting, setIsExiting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setIsExiting(true);
      setTimeout(() => onLogin(name), 800);
    }
  };

  return (
    <div className={`fixed inset-0 z-[70] bg-white flex items-center justify-center transition-all duration-1000 ease-in-out ${isExiting ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'}`}>
      
      <div className="relative w-full max-w-md px-10 flex flex-col items-center">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-black tracking-normal text-slate-900 mb-2">Login for Applicants</h1>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-8 animate-in fade-in slide-in-from-bottom duration-1000 delay-200">
          <div className="relative group">
            <input 
              autoFocus
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent border-b-2 border-slate-100 py-4 text-sm font-black uppercase tracking-[0.18em] text-slate-900 focus:border-blue-600 outline-none transition-all"
            />
            <div className="absolute bottom-0 left-0 h-[2px] bg-blue-600 w-0 group-focus-within:w-full transition-all duration-700"></div>
          </div>

          <button 
            type="submit"
            disabled={!name.trim()}
            className={`w-full py-5 text-[11px] font-black uppercase tracking-[0.18em] transition-all duration-500 shadow-xl ${
              name.trim() 
              ? 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700' 
              : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}
          >
            sign in
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginExperience;
