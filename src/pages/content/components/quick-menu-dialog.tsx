import { PortalProps } from '@mui/base/Portal';
import { ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { PopoverProps } from '@mui/material/Popover';

import React, { FC, useEffect } from 'react';

import { useSelector } from 'react-redux';

import { MuiIcon } from '@src/components';
import { MaterialIcon, QuickMenu, TaskForm } from '@src/models';
import { QueryService } from '@src/services';
import { StoreState } from '@src/store';
import { getQuick } from '@src/store/selectors';

import { anchor$, taskDialog$ } from '../index';

export const QuickMenuDialog: FC<{ container?: PortalProps['container'] }> = ({ container }) => {
  const [_anchor, setAnchor] = React.useState<PopoverProps['anchorEl']>();
  const [position, setPosition] = React.useState<PopoverProps['anchorPosition'] | undefined>();

  const [_form, setForm] = React.useState<TaskForm>();
  const menus = useSelector<StoreState, QuickMenu[]>(getQuick);

  useEffect(() => {
    const sub = anchor$.subscribe(({ event, anchor, form }) => {
      if (menus?.length > 1) {
        setForm(form);
        setAnchor(event ? null : anchor ?? null);
        setPosition(event ? { top: event.clientY, left: event.clientX } : undefined);
      } else if (menus?.length === 1) {
        createTask({ ...form, destination: menus[0].destination }, menus[0].modal);
      } else {
        createTask(form);
      }
    });
    return () => sub.unsubscribe();
  }, []);

  const createTask = (form: TaskForm, modal?: boolean) => {
    if (modal) {
      taskDialog$.next({ open: true, form });
    } else if (form?.uri) {
      QueryService.isLoggedIn && QueryService.createTask(form?.uri, form?.source, form?.destination?.path).subscribe();
    }
  };

  const open = Boolean(position || _anchor);
  const handleClose = () => {
    setAnchor(null);
    setPosition(undefined);
  };
  const handleClick = ({ destination, modal }: QuickMenu) => {
    handleClose();
    createTask({ ..._form, destination }, modal);
  };

  return (
    <Menu
      id="basic-menu"
      anchorEl={_anchor}
      anchorPosition={position}
      anchorReference={position ? 'anchorPosition' : 'anchorEl'}
      open={open}
      container={container}
      onClose={handleClose}
      MenuListProps={{
        'aria-labelledby': 'basic-button',
      }}
    >
      {menus?.map((m, i) => (
        <MenuItem key={m.id} onClick={() => handleClick(m)}>
          <ListItemIcon>
            <MuiIcon icon={m.icon ?? MaterialIcon.download} props={{ sx: { fontSize: '18px' } }} />
          </ListItemIcon>
          <ListItemText primary={m.title} primaryTypographyProps={{ sx: { fontSize: '12px' } }} />
        </MenuItem>
      ))}
    </Menu>
  );
};