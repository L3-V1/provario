import type { Component } from 'vue';

export type BreadcrumbItem = {
    label: string;
    href?: string;
};

export type NavItem = {
    label: string;
    href: string;
    icon?: Component;
    active?: boolean;
};
