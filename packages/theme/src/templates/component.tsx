import { graphql } from 'gatsby';
import { MDXRenderer } from 'gatsby-plugin-mdx';
import React from 'react';
import ApiLayout from '../components/ApiLayout';
import Example from '../components/Example';
import LinkedHeading from '../components/LinkedHeading';
import Heading from '../components/OutlineHeading';
import PropsTable from '../components/PropsTable';

// const styles = css`
//   @import '~@bfly/ui/lib/styles/theme';

//   .header {
//     color: $white-two;
//   }

//   .import {
//     display: block;
//     margin: 3rem 0 0 0;
//     font-size: 1.4rem;
//     color: $battleship-grey;
//   }
// `;

const propTypes = {};

function ComponentPageTemplate({ data }) {
  const { metadata, importName, name, example } = data.docpocalypse;

  // // TODO: This should be passed through somehow
  // const importName = `import ${displayName} from '${
  //   data.pkg.sourceInstanceName
  // }/lib/${displayName}';`;

  return (
    <ApiLayout>
      <div>
        <Heading h={1} id={`${name}-page`} title={name}>
          {name}
          {importName && <code className={styles.import}>{importName}</code>}
        </Heading>

        {metadata.description && metadata.description.childMdx && (
          <div className="lead">
            <MDXRenderer scope={{ React }}>
              {metadata.description.childMdx.body}
            </MDXRenderer>
          </div>
        )}
      </div>

      <Example example={example} name={name} />

      <LinkedHeading h={2} id={`${name}-api`}>
        API
      </LinkedHeading>

      <PropsTable metadata={metadata} />
    </ApiLayout>
  );
}

ComponentPageTemplate.propTypes = propTypes;

export default ComponentPageTemplate;

export const pageQuery = graphql`
  query($nodeId: String) {
    docpocalypse(id: { eq: $nodeId }) {
      id
      name
      importName
      example {
        ...Example_example
      }
      metadata {
        id
        description {
          childMdx {
            body
          }
        }
        ...PropsTable_metadata
      }
    }
  }
`;
