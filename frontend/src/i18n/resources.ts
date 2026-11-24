export const resources = {
    en: {
        translation: {
            app: { name: "Fullstack Blueprint" },
            navigation: {
                dashboard: "Dashboard", projects: "Projects", calendar: "Calendar", ai: "AI Studio", retrieval: "Retrieval", memory: "Memory", agent: "Agent", observability: "Observability", notifications: "Notifications", settings: "Settings", profile: "Profile settings", workspace: "Workspace", main: "Main navigation", breadcrumb: "Breadcrumb", openProfile: "Open profile", closeNavigation: "Close navigation", openNavigation: "Open navigation menu", collapseSidebar: "Collapse sidebar", expandSidebar: "Expand sidebar", searchPages: "Search pages", searchPagesHint: "Search pages and settings...", noMatchingPages: "No matching pages.", openNotificationCenter: "Open notification center", openProfileMenu: "Open profile menu",
            },
            actions: { signOut: "Sign out", search: "Search", send: "Send", close: "Close", selectLanguage: "Language", toggleTheme: "Cycle color theme", open: "Open", save: "Save", cancel: "Cancel", retry: "Retry" },
            status: { loading: "Loading", saving: "Saving...", unread: "{{count}} unread", unread_one: "{{count}} unread", unread_other: "{{count}} unread", allCaughtUp: "You are all caught up.", reviewNotifications: "Review your latest workspace notifications.", selectProject: "Select project", noProjects: "No projects available.", viewAllProjects: "View all projects", profile: "Profile", signedIn: "Signed in", yourProfile: "Your profile", couldNotSignOut: "Could not sign out. Try again." },
            accessibility: { skipToMain: "Skip to main content", closeOverlay: "Close navigation overlay", closeDialog: "Close dialog", notifications: "Notifications", theme: "Theme: {{mode}}" },
            language: { en: "English", nl: "Nederlands", fr: "Français", label: "Language", changed: "Language changed to {{language}}" },
            validation: { required: "This field is required.", email: "Enter a valid email address.", minLength: "Enter at least {{count}} characters.", invalid: "Enter a valid value." },
            dates: { today: "Today" },
        },
    },
    nl: {
        translation: {
            navigation: { dashboard: "Dashboard", projects: "Projecten", calendar: "Kalender", ai: "AI Studio", retrieval: "Ophalen", memory: "Geheugen", agent: "Agent", observability: "Observability", notifications: "Meldingen", settings: "Instellingen", profile: "Profielinstellingen", workspace: "Werkruimte", main: "Hoofdnavigatie", breadcrumb: "Kruimelpad", openProfile: "Profiel openen", closeNavigation: "Navigatie sluiten", openNavigation: "Navigatiemenu openen", collapseSidebar: "Zijbalk inklappen", expandSidebar: "Zijbalk uitklappen", searchPages: "Pagina's zoeken", searchPagesHint: "Pagina's en instellingen zoeken...", noMatchingPages: "Geen overeenkomende pagina's.", openNotificationCenter: "Meldingencentrum openen", openProfileMenu: "Profielmenu openen" },
            actions: { signOut: "Uitloggen", search: "Zoeken", send: "Versturen", close: "Sluiten", selectLanguage: "Taal", toggleTheme: "Thema wisselen", open: "Openen", save: "Opslaan", cancel: "Annuleren", retry: "Opnieuw proberen" },
            status: { saving: "Opslaan...", allCaughtUp: "Je bent helemaal bijgewerkt.", reviewNotifications: "Bekijk je nieuwste werkruimtemeldingen.", selectProject: "Project selecteren", noProjects: "Geen projecten beschikbaar.", viewAllProjects: "Alle projecten bekijken", profile: "Profiel", signedIn: "Aangemeld", yourProfile: "Je profiel", couldNotSignOut: "Uitloggen is niet gelukt. Probeer opnieuw." },
            accessibility: { skipToMain: "Ga naar hoofdinhoud", closeOverlay: "Navigatie-overlay sluiten", closeDialog: "Dialoog sluiten", notifications: "Meldingen", theme: "Thema: {{mode}}" },
            language: { en: "English", nl: "Nederlands", fr: "Français", label: "Taal", changed: "Taal gewijzigd naar {{language}}" },
            validation: { required: "Dit veld is verplicht.", email: "Voer een geldig e-mailadres in.", minLength: "Voer minstens {{count}} tekens in.", invalid: "Voer een geldige waarde in." },
        },
    },
    fr: {
        translation: {
            navigation: { dashboard: "Tableau de bord", projects: "Projets", calendar: "Calendrier", ai: "Studio IA", retrieval: "Recherche", memory: "Mémoire", agent: "Agent", observability: "Observabilité", notifications: "Notifications", settings: "Paramètres", profile: "Paramètres du profil", workspace: "Espace de travail", main: "Navigation principale", breadcrumb: "Fil d’Ariane", openProfile: "Ouvrir le profil", closeNavigation: "Fermer la navigation", openNavigation: "Ouvrir le menu de navigation", collapseSidebar: "Réduire la barre latérale", expandSidebar: "Développer la barre latérale", searchPages: "Rechercher des pages", searchPagesHint: "Rechercher des pages et paramètres...", noMatchingPages: "Aucune page correspondante.", openNotificationCenter: "Ouvrir le centre de notifications", openProfileMenu: "Ouvrir le menu du profil" },
            actions: { signOut: "Se déconnecter", search: "Rechercher", send: "Envoyer", close: "Fermer", selectLanguage: "Langue", toggleTheme: "Changer de thème", open: "Ouvrir", save: "Enregistrer", cancel: "Annuler", retry: "Réessayer" },
            status: { saving: "Enregistrement...", allCaughtUp: "Vous êtes à jour.", reviewNotifications: "Consultez vos dernières notifications de l’espace de travail.", selectProject: "Sélectionner un projet", noProjects: "Aucun projet disponible.", viewAllProjects: "Voir tous les projets", profile: "Profil", signedIn: "Connecté", yourProfile: "Votre profil", couldNotSignOut: "Impossible de se déconnecter. Réessayez." },
            accessibility: { skipToMain: "Aller au contenu principal", closeOverlay: "Fermer la superposition de navigation", closeDialog: "Fermer la boîte de dialogue", notifications: "Notifications", theme: "Thème : {{mode}}" },
            language: { en: "English", nl: "Nederlands", fr: "Français", label: "Langue", changed: "Langue changée en {{language}}" },
            validation: { required: "Ce champ est obligatoire.", email: "Saisissez une adresse e-mail valide.", minLength: "Saisissez au moins {{count}} caractères.", invalid: "Saisissez une valeur valide." },
        },
    },
} as const;

export type SupportedLanguage = keyof typeof resources;
export const supportedLanguages = Object.keys(resources) as SupportedLanguage[];
