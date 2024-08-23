import React, { useState } from 'react';
import { Settings, X, Book} from 'lucide-react';

const Header = ({ onOpenRules, isDarkMode }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  //rawr :3
  return (
    <>
      <header className="w-full text-white p-4 relative z-10">
        <div className="mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Kypo.lol</h1>
          <div className="flex space-x-2">
            <button
              onClick={onOpenRules}
              className="p-2 rounded-full hover:bg-gray-800 transition-colors"
              aria-label="Open Rules"
            >
              <Book size={24} />
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-full hover:bg-gray-800 transition-colors"
              aria-label="Open Settings"
            >
              <Settings size={24} />
            </button>
          </div>
        </div>
      </header>
      <div className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 text-black dark:text-white p-6 transform transition-transform duration-300 ease-in-out z-30 ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Settings</h2>
          <button onClick={() => setIsSettingsOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
            <select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-black dark:text-white">
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </div>
          <div>
            <label className="flex items-center">
              <input type="checkbox" className="form-checkbox h-5 w-5 text-indigo-600" />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enable notifications</span>
            </label>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;