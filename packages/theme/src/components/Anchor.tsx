import dstyled from 'astroturf';
import React, { ReactNode, ReactType } from 'react';

const Wrapper = dstyled('span')`
  position: relative;
  display: inline-block;
  padding-right: 1em;
`;

const A = dstyled('a')`
  font-size: 90%;
  position: absolute;
  right: 0.3em;
  padding-top: 0.1em;
  opacity: 0;

  &:focus,
  :global(.__heading):hover & {
    text-decoration: none;
    opacity: 0.5;
  }
`;

interface Props {
  as?: ReactType;
  target: string;
  children?: ReactNode;
  className?: string;
}

/**
 * @shadowable
 */
function Anchor({ as: asProp, target, children, className }: Props) {
  return (
    // @ts-ignore
    <Wrapper as={asProp} className={className}>
      {children}
      <A href={`#${target}`} aria-hidden>
        <span aria-hidden>#</span>
      </A>
    </Wrapper>
  );
}

export default Anchor;
