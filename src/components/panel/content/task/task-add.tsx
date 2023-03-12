import { Box, Button, Card, CardActions, CardContent, CardHeader, Chip, Grid, Stack, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';

import React, { useEffect, useState } from 'react';

import { useForm } from 'react-hook-form';

import { lastValueFrom, tap } from 'rxjs';

import { useI18n } from '@dvcol/web-extension-utils';

import { FormCheckbox, FormExplorer, FormInput, FormSwitch } from '@src/components';
import type { FormRules, TaskCreateRequest, TaskForm, TaskListDownloadRequest } from '@src/models';
import { TaskCreateType, torrentExtension } from '@src/models';
import { QueryService } from '@src/services';

import { TaskAddSelect } from './task-add-select';

import type { CardProps } from '@mui/material';
import type { ChangeEvent, FC } from 'react';
import type { SubmitHandler } from 'react-hook-form';

const UrlCounts: FC<{ urls?: string[] }> = ({ urls }) => {
  const i18n = useI18n('panel', 'content', 'task', 'add');
  if (!urls?.length) return null;

  const tooltip = urls?.map((_url, i) => (
    <Box key={i} sx={{ borderTop: i ? '0.03em solid #757575' : 0, p: '0.25em' }}>
      {_url}
    </Box>
  ));

  return (
    <Tooltip arrow PopperProps={{ disablePortal: true }} title={<Box sx={{ wordBreak: 'break-all' }}>{tooltip}</Box>} sx={{ ml: '0.5rem' }}>
      <Chip
        label={
          <Box sx={{ fontSize: '1em' }}>
            <span>{urls?.length}</span>&nbsp;<span>{i18n('urls')}</span>
          </Box>
        }
        size="small"
        variant="outlined"
        color="primary"
      />
    </Tooltip>
  );
};

export const TaskAdd: FC<{
  form?: TaskForm;
  withCancel?: boolean;
  onFormCancel?: (form: TaskForm | TaskListDownloadRequest) => void;
  onFormSubmit?: (form: TaskForm | TaskListDownloadRequest) => void;
  cardProps?: CardProps;
  allowFile?: boolean;
}> = ({ form, withCancel, onFormCancel, onFormSubmit, cardProps, allowFile }) => {
  const i18n = useI18n('panel', 'content', 'task', 'add');
  const [path, setPath] = React.useState<string>(form?.destination?.path ?? '');
  const [type, setType] = useState(TaskCreateType.url);
  const [file, setFile] = useState<File>();
  const [openSelect, setOpenSelect] = useState<{ open: boolean; list_id?: string }>({ open: false });

  const isFile = allowFile && type === TaskCreateType.file;

  const {
    handleSubmit,
    control,
    reset,
    getValues,
    formState: { isValid, isDirty, isSubmitted, isSubmitSuccessful },
  } = useForm<TaskForm>({
    mode: 'onChange',
    defaultValues: {
      uri: form?.uri ?? '',
      source: form?.source ?? 'Custom Task',
      destination: { custom: form?.destination?.custom ?? false, path: path ?? '' },
      username: form?.username ?? '',
      password: form?.password ?? '',
      extract_password: form?.extract_password ?? '',
      torrent: form?.torrent ?? '',
      create_list: form?.create_list ?? false,
    },
  });

  const rules: FormRules<TaskForm> = {
    uri: {
      required: { value: type === TaskCreateType.url, message: i18n('required', 'common', 'error') },
      validate: (_uri?: string) => !!_uri?.trim()?.length || i18n('required', 'common', 'error'),
    },
    torrent: {
      required: { value: type === TaskCreateType.file, message: i18n('required', 'common', 'error') },
    },
  };

  useEffect(() => {
    if (!path?.length && QueryService.isLoggedIn) {
      QueryService.getConfig().subscribe(({ default_destination: _path }) => {
        reset({ ...getValues(), destination: { ...getValues()?.destination, path: _path } });
        setPath(_path);
      });
    }
  }, []);

  const onCancel = (data: TaskForm = getValues()) => {
    onFormCancel?.(data);
  };

  const parseUrls = (uri?: string) =>
    uri
      ?.split(/\r?\n/)
      ?.map(_uri => _uri?.trim())
      .filter(Boolean);

  const [urls, setUrls] = useState<string[] | undefined>(parseUrls(getValues().uri));

  const createTask = (data: TaskForm) => {
    const { source, destination, username, password, extract_password, create_list } = data;
    const _request: Partial<TaskCreateRequest> = {
      type,
      destination: destination?.custom ? destination?.path : undefined,
      username: username?.length ? username : undefined,
      password: password?.length ? password : undefined,
      extract_password: extract_password?.length ? extract_password : undefined,
      create_list,
    };
    if (type === TaskCreateType.url) {
      _request.url = urls;
      _request.torrent = undefined;
    } else if (type === TaskCreateType.file) {
      _request.url = undefined;
      _request.torrent = file;
    }

    return QueryService.createTask(_request, {
      source,
      torrent: file,
    }).pipe(
      tap(response => {
        const list_id = response?.list_id?.[0];
        reset(data);
        if (list_id) {
          setOpenSelect({ open: true, list_id });
        } else {
          onFormSubmit?.(data);
        }
      }),
    );
  };

  const onSubmit: SubmitHandler<TaskForm> = data => {
    if (data?.torrent?.length || urls?.length) return lastValueFrom(createTask(data));
    return Promise.reject(i18n(`${isFile ? 'file' : 'url'}_required`));
  };

  const onSubmitColor = () => {
    if (!isSubmitted || isDirty) return 'info';
    return isSubmitSuccessful ? 'success' : 'error';
  };

  return (
    <Card raised={true} {...cardProps}>
      <CardHeader
        title={i18n('title')}
        subheader={i18n('subheader')}
        titleTypographyProps={{ variant: 'h6', color: 'text.primary', fontSize: '1em' }}
        subheaderTypographyProps={{ variant: 'subtitle2', fontSize: '0.875em' }}
        sx={{ p: '1em 1em 0', textTransform: 'capitalize' }}
        action={
          allowFile && (
            <ToggleButtonGroup
              color="primary"
              size="small"
              value={type}
              exclusive
              onChange={(_, _type) => setType(_type)}
              aria-label="task-create-type"
              disabled={!allowFile}
            >
              {Object.values(TaskCreateType).map(priority => (
                <ToggleButton key={priority} value={priority} sx={{ textTransform: 'inherit', minWidth: '4em' }}>
                  {i18n(priority, 'common', 'model', 'task_create_type')}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )
        }
      />
      <CardContent sx={{ display: 'flex', flexDirection: 'row', p: '0.5em 1em 0.75em', fontSize: '1em' }}>
        <Grid container spacing={2}>
          <Grid item xs={6} sx={{ display: 'flex', flexDirection: 'column' }}>
            <CardHeader
              title={i18n('source_title')}
              subheader={i18n('source_subheader')}
              titleTypographyProps={{ variant: 'subtitle2', fontSize: '0.875em' }}
              subheaderTypographyProps={{ variant: 'subtitle2', fontSize: '0.75em' }}
              action={<UrlCounts urls={urls} />}
              sx={{ p: '0.5em 0' }}
            />
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                flex: '1 1 auto',
                justifyContent: 'space-around',
                gap: '1em',
                p: '0.5em 0',
                fontSize: '0.9em',
              }}
            >
              {isFile ? (
                <>
                  <FormInput
                    controllerProps={{ name: 'torrent', control, rules: rules.torrent }}
                    textFieldProps={{
                      type: 'file',
                      label: i18n('torrent_file_label'),
                      placeholder: i18n('torrent_file_placeholder'),
                      inputProps: { style: { fontSize: '0.875em' } },
                      disabled: !isFile,
                      onChange: ($event: ChangeEvent<HTMLInputElement>) => setFile($event.target?.files?.[0]),
                    }}
                    inputFileProps={{ split: true, accept: `${torrentExtension.mime},.torrent` }}
                  >
                    <FormCheckbox
                      controllerProps={{ name: 'create_list', control }}
                      formControlLabelProps={{ label: i18n('create_list_label'), disabled: !isFile }}
                    />
                  </FormInput>
                </>
              ) : (
                <FormInput
                  controllerProps={{
                    name: 'uri',
                    control,
                    rules: rules.uri,
                  }}
                  textFieldProps={{
                    label: i18n('url_label'),
                    multiline: true,
                    rows: 4,
                    onChange: e => setUrls(parseUrls(e.target.value)),
                    inputProps: { style: { fontSize: '0.875em', wordBreak: 'break-all' } },
                    disabled: isFile,
                  }}
                />
              )}
              <FormInput
                controllerProps={{ name: 'username', control }}
                textFieldProps={{
                  label: i18n('username_label'),
                  inputProps: { style: { fontSize: '0.875em' } },
                }}
              />
              <FormInput
                controllerProps={{ name: 'password', control }}
                textFieldProps={{
                  type: 'password',
                  label: i18n('ftp_password_label'),
                  inputProps: { style: { fontSize: '0.875em' } },
                }}
                iconProps={{ sx: { fontSize: '1em' } }}
              />
              <FormInput
                controllerProps={{ name: 'extract_password', control }}
                textFieldProps={{
                  type: 'password',
                  label: i18n('zip_password_label'),
                  inputProps: { style: { fontSize: '0.875em' } },
                }}
                iconProps={{ sx: { fontSize: '1em' } }}
              />
            </Box>
          </Grid>
          <Grid item xs={6} sx={{ display: 'flex', flexDirection: 'column' }}>
            <CardHeader
              title={i18n('destination_title')}
              subheader={i18n('destination_subheader')}
              titleTypographyProps={{ variant: 'subtitle2', fontSize: '0.875em' }}
              subheaderTypographyProps={{ variant: 'subtitle2', fontSize: '0.75em' }}
              action={<FormSwitch controllerProps={{ name: 'destination.custom', control }} formControlLabelProps={{ label: '' }} />}
              sx={{ p: '0.5em 0' }}
            />
            <Card sx={{ p: '0.5em', flex: '1 1 auto', m: '0.5em 0', height: '20em' }}>
              <FormExplorer
                controllerProps={{ name: 'destination.path', control }}
                explorerProps={{
                  flatten: true,
                  disabled: !getValues()?.destination?.custom,
                  startPath: path,
                  editable: true,
                }}
              />
            </Card>
          </Grid>
        </Grid>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', padding: '0 1.5em 1em' }}>
        <Stack direction="row" spacing={2}>
          {withCancel && (
            <Button variant="outlined" color={'secondary'} sx={{ width: '5em', fontSize: '0.75em' }} onClick={() => onCancel()}>
              {i18n('cancel', 'common', 'buttons')}
            </Button>
          )}
          <Button
            variant="outlined"
            color={onSubmitColor()}
            sx={{ width: '5em', fontSize: '0.75em' }}
            type="submit"
            disabled={!isValid || !QueryService.isLoggedIn}
            onClick={handleSubmit(onSubmit)}
          >
            {i18n('save', 'common', 'buttons')}
          </Button>
        </Stack>
      </CardActions>
      {isFile && openSelect.list_id && (
        <TaskAddSelect
          open={openSelect.open}
          list_id={openSelect.list_id}
          source={getValues()?.source ?? 'Custom Task'}
          destination={getValues().destination?.path}
          onFormCancel={data => {
            setOpenSelect(_current => ({ open: false }));
            onFormSubmit?.(data);
          }}
          onFormSubmit={data => {
            setOpenSelect(_current => ({ open: false }));
            onFormSubmit?.(data);
          }}
        />
      )}
    </Card>
  );
};
