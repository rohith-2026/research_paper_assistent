import { ReactNode } from "react";
import { motion } from "framer-motion";
import { useI18n } from "../../i18n";

interface PageShellProps {
    children: ReactNode;
    title?: string;
    subtitle?: string;
}

export default function PageShell({ children, title, subtitle }: PageShellProps) {
    const { t } = useI18n();
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full flex flex-col page-enter"
        >
            {(title || subtitle) && (
                <div className="mb-6">
                    {title && <h1 className="text-2xl font-bold mb-1">{t(title)}</h1>}
                    {subtitle && <p className="text-sm text-white/60">{t(subtitle)}</p>}
                </div>
            )}
            <div className="flex-1 min-h-0">
                {children}
            </div>
        </motion.div>
    );
}
