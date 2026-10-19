import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  X,
  Check,
  LoaderCircle,
  AlertCircle,
  ArrowRight,
  Plus,
  Mic,
  Building2,
  FolderKanban,
  Users,
  Inbox,
  Files,
  Settings,
  Search,
  ChevronDown,
  ChevronRight,
  Play,
  RotateCw,
  LogOut,
  Download,
  MoreHorizontal,
  CheckCheck,
  Send,
  Square,
  Upload,
  Volume2,
  Monitor,
  BookOpen,
  Palette,
  Video,
  Armchair,
  ShieldCheck,
  PanelRightClose,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  ArrowUpRight,
  Command,
  Clock,
  CalendarDays,
  Trash2,
  Pencil,
  FileText,
  Globe,
  Cloud,
  ExternalLink,
  Eye,
  MessageSquare,
  AudioLines,
  Pause,
  Shield,
  Sun,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  LayoutGrid,
  List,
  type LucideIcon,
} from "lucide-react";
import type { TaskStatus } from "../../shared/studio";
import { statusNames } from "../../shared/studio";
export const icons = {
  close: X,
  check: Check,
  loading: LoaderCircle,
  error: AlertCircle,
  arrow: ArrowRight,
  plus: Plus,
  mic: Mic,
  office: Building2,
  projects: FolderKanban,
  agents: Users,
  approvals: Inbox,
  artifacts: Files,
  settings: Settings,
  search: Search,
  down: ChevronDown,
  right: ChevronRight,
  play: Play,
  retry: RotateCw,
  logout: LogOut,
  download: Download,
  more: MoreHorizontal,
  checks: CheckCheck,
  send: Send,
  stop: Square,
  upload: Upload,
  audio: Volume2,
  computer: Monitor,
  research: BookOpen,
  design: Palette,
  meeting: Video,
  lounge: Armchair,
  review: ShieldCheck,
  collapse: PanelRightClose,
  sliders: SlidersHorizontal,
  maximize: Maximize2,
  minimize: Minimize2,
  upRight: ArrowUpRight,
  command: Command,
  clock: Clock,
  calendar: CalendarDays,
  delete: Trash2,
  edit: Pencil,
  file: FileText,
  globe: Globe,
  cloud: Cloud,
  external: ExternalLink,
  eye: Eye,
  message: MessageSquare,
  wave: AudioLines,
  pause: Pause,
  shield: Shield,
  sun: Sun,
  left: ChevronLeft,
  zoomIn: ZoomIn,
  zoomOut: ZoomOut,
  grid: LayoutGrid,
  list: List,
} satisfies Record<string, LucideIcon>;
export type IconName = keyof typeof icons;
export function Icon({
  name,
  size = 18,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const Component = icons[name];
  return (
    <Component
      size={size}
      strokeWidth={1.65}
      className={className}
      aria-hidden="true"
    />
  );
}
export function Button({
  children,
  icon,
  onClick,
  disabled = false,
  variant = "",
  type = "button",
  title,
  className = "",
}: {
  children?: ReactNode;
  icon?: IconName;
  onClick?: () => void;
  disabled?: boolean;
  variant?: string;
  type?: "button" | "submit";
  title?: string;
  className?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-label={title}
      title={title}
      className={`button ${variant} ${className}`}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </motion.button>
  );
}
export function Badge({
  status,
  children,
}: {
  status?: TaskStatus;
  children?: ReactNode;
}) {
  return (
    <span className={`badge ${status ?? ""}`}>
      {status && <i />}
      {children ?? (status ? statusNames[status] : "")}
    </span>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => {
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={wide ? "wide" : ""}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        className="dialog-content"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
      >
        <header className="dialog-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <Button
            icon="close"
            title="閉じる"
            variant="icon-button"
            onClick={onClose}
          />
        </header>
        {children}
      </motion.div>
    </dialog>
  );
}
export function Skeleton({ full = true }: { full?: boolean }) {
  return (
    <div
      className={full ? "app-skeleton" : "view-skeleton"}
      role="status"
      aria-label="読み込み中"
      aria-busy="true"
    >
      {full && (
        <aside>
          <i className="sk sk-brand" />
          {Array.from({ length: 6 }, (_, i) => (
            <i className="sk sk-nav" key={i} />
          ))}
        </aside>
      )}
      <section>
        <header>
          <i className="sk sk-title" />
          <i className="sk sk-action" />
        </header>
        <div className="skeleton-stat">
          {[1, 2, 3].map((i) => (
            <i key={i} className="sk" />
          ))}
        </div>
        <div className="skeleton-body">
          <div className="sk sk-office" />
          <div className="sk sk-inspector" />
        </div>
      </section>
      <span className="sr-only">データを読み込んでいます</span>
    </div>
  );
}
export function Empty({
  icon = "projects",
  title,
  children,
  action,
}: {
  icon?: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon name={icon} size={28} />
      </div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
export function Toast({
  message,
  onClose,
  error = false,
}: {
  message: string;
  onClose: () => void;
  error?: boolean;
}) {
  useEffect(() => {
    if (error) return;
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [message, onClose, error]);
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className={`toast ${error ? "is-error" : ""}`}
          role={error ? "alert" : "status"}
          initial={{ y: 30, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 15, opacity: 0 }}
        >
          <Icon name={error ? "error" : "check"} size={18} />
          <span>{message}</span>
          <Button
            icon="close"
            title="通知を閉じる"
            variant="icon-button"
            onClick={onClose}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export function downloadFile(
  name: string,
  content: string,
  type = "text/markdown;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name.replace(/[<>:"/\\|?*]/g, "-");
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
