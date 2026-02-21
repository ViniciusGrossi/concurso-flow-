'use client';
import { motion, Variants } from 'framer-motion';
import { ReactNode } from 'react';

const pageVariants: Variants = {
    initial: { opacity: 0, y: 16, filter: 'blur(3px)' },
    animate: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.38, ease: [0.19, 1, 0.22, 1] }
    },
    exit: { opacity: 0, y: -8, transition: { duration: 0.18 } }
};

export default function PageTransition({ children }: { children: ReactNode }) {
    return (
        <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
        >
            {children}
        </motion.div>
    );
}
