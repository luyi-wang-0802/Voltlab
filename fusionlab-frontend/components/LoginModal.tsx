import React, { useState } from 'react';

interface LoginModalProps {
  onLogin: (name: string) => void;
  onGuest: () => void;
  isProfileTarget?: boolean;
}

const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onGuest, isProfileTarget }) => {
  const [name, setName] = useState('');
  const [isExiting, setIsExiting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setIsExiting(true);
      setTimeout(() => onLogin(name), 600);
    }
  };

  const handleGuest = () => {
    setIsExiting(true);
    setTimeout(onGuest, 300);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center md:p-6 animate-in fade-in duration-500">
      <div 
        className={`absolute inset-0 bg-slate-900/70 transition-opacity duration-700 ${isExiting ? 'opacity-0' : 'opacity-100'} ${isProfileTarget ? 'bg-white' : ''}`} 
        onClick={handleGuest}
      />

      {/* cancel */}
      <button
        onClick={handleGuest}
        className="fixed top-0 right-0 z-[120] bg-black w-14 h-14 flex items-center justify-center text-white text-3xl font-black shadow-xl hover:bg-slate-800 transition-all focus:outline-none"
        aria-label="Close login modal"
        type="button"
        style={{ boxShadow: '0 8px 32px 0 rgba(0,0,0,0.18)' }}
      >
        ×
      </button>
      
      <div 
        className={`relative w-full max-w-5xl h-full md:h-auto bg-white shadow-[0_60px_150px_rgba(0,0,0,0.4)] flex flex-col md:flex-row overflow-y-auto overflow-x-hidden md:overflow-hidden transition-opacity duration-400 ${isExiting ? 'opacity-0' : 'opacity-100'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full md:w-1/2 bg-slate-50 p-16 md:p-24 flex flex-col items-center justify-center border-r border-slate-100">
           {/* Removed 'Identity Node' heading */}
          <div className="relative z-10 flex items-center justify-center w-full h-64">
            <img src="/icon/building.png" alt="Building Logo" className="w-130 h-130 object-contain mx-auto mt-10" />
          </div>
          <div className="mt-20 text-center w-full">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-300">Register to unlock smart booking, personalized spaces, and exclusive events!</p>
          </div>
        </div>

        <div className="w-full md:w-1/2 p-16 md:p-24 flex flex-col justify-start bg-white pt-4">
          <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-normal leading-none whitespace-nowrap">WELCOME TO VOLTLAB!</h2>
          <form onSubmit={handleSubmit} className="space-y-16 mt-2">
            <div className="mb-12">
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-16 block">Identify by Name</label>
              <input 
                type="text" 
                value={name}
                placeholder="FULL IDENTITY"
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-b-2 border-slate-100 py-5 text-lg font-black tracking-[0.18em] text-slate-900 focus:border-blue-600 outline-none transition-all placeholder:text-slate-100 uppercase"
              />
            </div>
            <div className="space-y-8">
              <button 
                type="submit"
                disabled={!name.trim()}
                className={`w-full py-6 text-[11px] font-black uppercase tracking-[0.18em] transition-all duration-700 shadow-2xl ${
                  name.trim() 
                  ? 'bg-slate-900 text-white shadow-slate-200 hover:bg-blue-600' 
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                Sync Identity
              </button>
              <div className="flex justify-between items-center pt-6">
                <button 
                  type="button" 
                  onClick={handleGuest}
                  className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 hover:text-blue-600 transition-colors"
                >
                  Continue as Guest
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
