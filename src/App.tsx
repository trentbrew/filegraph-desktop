import './App.css';
import { FileStructure } from './components/app/fileStructure';
import { Toaster } from '@/components/ui/sonner';
import TitleBar from './components/app/titleBar';

function App() {
  return (
    <div className="h-screen w-screen p-0 m-0 overflow-hidden bg-transparent rounded-lg">
      <div className="h-full flex flex-col overflow-hidden bg-background shadow-2xl">
        <TitleBar />
        <div className="flex-1 overflow-hidden">
          <FileStructure />
        </div>
        <Toaster />
      </div>
    </div>
  );
}

export default App;
