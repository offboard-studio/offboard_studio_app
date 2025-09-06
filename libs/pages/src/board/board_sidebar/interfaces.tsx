
interface BlockItem {
  id: string;
  label: string;
  path: string;
  file: string;
}

interface Category {
  id: string;
  label: string;
  items: BlockItem[];
}

interface SidebarLayer {
  id: string;
  title: string;
  content: React.ReactNode;
  width: string;
}

interface BlockDetail {
  label: string;
  json: any;
}

interface BoardSideBarProps {
  editor?: any; // Editor prop'u opsiyonel yaptım
}
