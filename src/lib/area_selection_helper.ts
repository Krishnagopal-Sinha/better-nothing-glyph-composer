import * as React from 'react';
import dataStore from './data_store';

interface Coordinates {
  x: number;
  y: number;
}
interface DrawnArea {
  start: undefined | Coordinates;
  end: undefined | Coordinates;
}
interface UseAreaSelectionProps {
  container: React.RefObject<HTMLElement> | undefined;
}
const boxNode = document.createElement('div');
boxNode.style.position = 'fixed';
boxNode.style.background = 'rgba(255, 255, 255, 0.5)';
boxNode.style.border = 'solid 1px white';
boxNode.style.borderRadius = '2px';
boxNode.style.mixBlendMode = 'screen';
boxNode.style.pointerEvents = 'none';

export function useAreaSelection({
  container = { current: document.body }
}: UseAreaSelectionProps) {
  const boxRef = React.useRef<HTMLDivElement>(boxNode);
  const boxElement = boxRef;
  const [mouseDown, setMouseDown] = React.useState<boolean>(false);
  const [selection, setSelection] = React.useState<DOMRect | null>(null);
  const [drawArea, setDrawArea] = React.useState<DrawnArea>({
    start: undefined,
    end: undefined
  });

  const handleMouseMove = (e: MouseEvent) => {
    // check here as well as mouse down only fires once! safety fallback
    const isDragSelectActive: boolean = dataStore.get('isDragSelectActive') ?? false;
    if (!isDragSelectActive) return;
    document.body.style.userSelect = 'none';
    setDrawArea((prev) => ({
      ...prev,
      end: {
        x: e.clientX,
        y: e.clientY
      }
    }));
  };
  // throttle mouse move
  // const throttledMouseMove = throttle((e: MouseEvent) => {
  //   const isDragSelectActive: boolean = dataStore.get('isDragSelectActive') ?? false;
  //   if (!isDragSelectActive) return;

  //   document.body.style.userSelect = 'none';
  //   setDrawArea((prev) => ({
  //     ...prev,
  //     end: {
  //       x: e.clientX,
  //       y: e.clientY
  //     }
  //   }));
  // }, 20);
  const handleMouseDown = (e: MouseEvent) => {
    const isDragSelectActive: boolean = dataStore.get('isDragSelectActive') ?? false;
    if (!isDragSelectActive) return;
    const containerElement = container.current;

    setMouseDown(true);

    if (containerElement && containerElement.contains(e.target as HTMLElement)) {
      document.addEventListener('mousemove', handleMouseMove);
      setDrawArea({
        start: {
          x: e.clientX,
          y: e.clientY
        },
        end: {
          x: e.clientX,
          y: e.clientY
        }
      });
    }
  };

  const handleMouseUp = () => {
    document.body.style.userSelect = 'initial';
    document.removeEventListener('mousemove', handleMouseMove);
    setMouseDown(false);
    // set selection
  };

  React.useEffect(() => {
    const containerElement = container.current;
    if (containerElement) {
      containerElement.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        containerElement.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [container]);

  React.useEffect(() => {
    const { start, end } = drawArea;
    if (start && end && boxElement.current) {
      drawSelectionBox(boxElement.current, start, end);
      setSelection(boxElement.current.getBoundingClientRect());
    }
  }, [drawArea, boxElement]);

  React.useEffect(() => {
    const containerElement = container.current;
    const selectionBoxElement = boxElement.current;
    if (containerElement && selectionBoxElement) {
      if (mouseDown) {
        if (!document.body.contains(selectionBoxElement)) {
          containerElement.appendChild(selectionBoxElement);
        }
      } else {
        if (containerElement.contains(selectionBoxElement)) {
          containerElement.removeChild(selectionBoxElement);
        }
      }
    }
  }, [mouseDown, container, boxElement]);

  return selection;
}

export function useSelected(elementRef: React.RefObject<HTMLElement>, selection: DOMRect | null) {
  const [isSelected, setIsSelected] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!elementRef.current || !selection) {
      setIsSelected(false);
    } else {
      const a = elementRef.current.getBoundingClientRect();
      const b = selection;
      setIsSelected(
        !(
          a.y + a.height < b.y ||
          a.y > b.y + b.height ||
          a.x + a.width < b.x ||
          a.x > b.x + b.width
        )
      );
      // console.log('block drag selection updated!');
    }
  }, [elementRef, selection]);

  return isSelected;
}

function drawSelectionBox(boxElement: HTMLElement, start: Coordinates, end: Coordinates): void {
  const b = boxElement;
  if (end.x > start.x) {
    b.style.left = start.x + 'px';
    b.style.width = end.x - start.x + 'px';
  } else {
    b.style.left = end.x + 'px';
    b.style.width = start.x - end.x + 'px';
  }

  if (end.y > start.y) {
    b.style.top = start.y + 'px';
    b.style.height = end.y - start.y + 'px';
  } else {
    b.style.top = end.y + 'px';
    b.style.height = start.y - end.y + 'px';
  }
}
