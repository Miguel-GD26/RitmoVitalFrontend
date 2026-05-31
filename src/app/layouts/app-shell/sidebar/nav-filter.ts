import { MenuItem, NAV_ITEMS } from './nav-config';

export function filterNavByRole(groups: string[], isSuperuser = false): MenuItem[] {
  if (isSuperuser) {
    return NAV_ITEMS.map(item => ({ ...item }));
  }

  return NAV_ITEMS
    .filter(item => {
      if (!item.roles || item.roles.length === 0) return true;
      return item.roles.some(role => groups.includes(role));
    })
    .map(item => ({
      ...item,
      subMenu: item.subMenu?.filter(sub => {
        if (!sub.roles || sub.roles.length === 0) return true;
        return sub.roles.some(role => groups.includes(role));
      }),
    }));
}
