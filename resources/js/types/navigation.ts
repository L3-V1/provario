import type { Component } from 'vue';

export type BreadcrumbItem = {
    label: string;
    href?: string;
};

export type NavItem = {
    label: string;
    href: string;
    icon?: Component;
    /** Emoji decorativo exibido ao lado do label (renderizado com aria-hidden). */
    emoji?: string;
    active?: boolean;
};
