import { Accordion, AccordionDetails, AccordionSummary, ButtonGroup } from '@mui/material';

import React, { forwardRef, useState } from 'react';

import { useSelector } from 'react-redux';

import type { ProgressBackgroundProps } from '@src/components';
import { ProgressBackground } from '@src/components';

import type { Global } from '@src/models';
import type { StoreState } from '@src/store';
import { getGlobalTask } from '@src/store/selectors';

import type { ForwardRefRenderFunction } from 'react';

type ContentItemProps = {
  background?: ProgressBackgroundProps;
  summary: { card: JSX.Element; buttons?: JSX.Element };
  details?: JSX.Element;
  onToggle: (expanded: boolean) => void;
  onHover: (visible: boolean) => void;
};

const ContentItemComponent: ForwardRefRenderFunction<HTMLDivElement, ContentItemProps> = (
  { background, summary, details, onToggle, onHover },
  ref,
) => {
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);

  const onChange = (_: React.SyntheticEvent, _expanded: boolean) => {
    setExpanded(_expanded);
    onToggle(_expanded);
  };
  const onMouseHover = (hover: boolean) => {
    setVisible(hover);
    onHover(visible);
  };

  const showBackground = useSelector<StoreState, Global['task']>(getGlobalTask)?.background;
  return (
    <Accordion ref={ref} onChange={onChange} TransitionProps={{ unmountOnExit: true }}>
      <AccordionSummary
        aria-controls="task-content"
        id="task-header"
        sx={{ padding: 0, position: 'relative' }}
        onMouseOver={() => onMouseHover(true)}
        onMouseLeave={() => onMouseHover(false)}
      >
        {showBackground && background && <ProgressBackground {...background} />}
        {summary.card}
        {summary.buttons && visible && !expanded && (
          <ButtonGroup orientation="vertical" variant="text">
            {summary.buttons}
          </ButtonGroup>
        )}
      </AccordionSummary>
      <AccordionDetails sx={{ padding: '1rem' }}>{details}</AccordionDetails>
    </Accordion>
  );
};

export const ContentItem = forwardRef(ContentItemComponent);