import React from 'react';

interface IconProps {
  name: 'send' | 'edit' | 'delete' | 'search' | 'settings' | 'logout' | 'user';
  className?: string;
}

const icons: Record<string, string> = {
  send: '/icons/send.svg',
  edit: '/icons/edit.svg',
  delete: '/icons/delete.svg',
  search: '/icons/search.svg',
  settings: '/icons/settings.svg',
  logout: '/icons/logout.svg',
  user: '/icons/user.svg',
};

const Icon: React.FC<IconProps> = ({ name, className }) => (
  <img src={icons[name]} className={className} alt={name + ' icon'} width={20} height={20} />
);

export default Icon;
