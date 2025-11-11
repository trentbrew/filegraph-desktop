import './App.css';
import { FileStructure } from './components/app/fileStructure';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <div className="h-screen w-screen p-0 m-0 overflow-hidden bg-transparent rounded-lg">
      <div className="h-full flex flex-col overflow-hidden rounded-[12px] bg-background shadow-2xl">
        <FileStructure />
        <Toaster />
      </div>
    </div>
  );
}

export default App;
