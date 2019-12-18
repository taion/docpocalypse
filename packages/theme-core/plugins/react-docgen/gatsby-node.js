const path = require('path');
const parseMetadata = require('./parse');

const propsId = (parentId, name) => `${parentId}--ComponentProp-${name}`;
const descId = parentId => `${parentId}--ComponentDescription`;
const withoutExtension = p =>
  path.join(path.dirname(p), path.basename(p, path.extname(p)));

exports.sourceNodes = ({ actions }) => {
  const { createTypes } = actions;

  createTypes(/* GraphQL */ `
    type PropDefaultValue @dontInfer {
      value: String
      computed: Boolean
    }

    type PropTypeValue @dontInfer {
      name: String!
      value: JSON
      raw: String
    }

    type ComponentMethodParams @dontInfer {
      name: String
      type: JSON
    }

    type ComponentTag @dontInfer {
      name: String!
      value: JSON!
    }

    type ComponentMethod @dontInfer {
      name: String!
      description: String

      # The raw comment block leading a method declaration
      docblock: String

      # Modifiers describing the kind and sort of method e.g. "static", "generator", or "async".
      modifiers: [String]

      params: [ComponentMethodParams]
      returns: JSON
    }

    type ComponentProp implements Node @infer {
      type: PropTypeValue
      flowType: JSON
      tsType: JSON
      description: ComponentDescription! @link

      defaultValue: PropDefaultValue
      tags: [ComponentTag]!

      # The raw comment block leading a propType declaration
      docblock: String

      # Describes whether or not the propType is required, i.e. not \`null\`
      required: Boolean!
    }

    type ComponentDescription implements Node @infer {
      text: String!
    }

    type ComponentComposes @dontInfer {
      path: String!
      metadata: ComponentMetadata
    }

    type ComponentMetadata implements Node @infer {
      absolutePath: String

      description: ComponentDescription! @link

      props: [ComponentProp]! @link

      tags: [ComponentTag]!

      # A list of additional modules "spread" into this component's propTypes such as:
      #
      # propTypes = {
      #   name: PropTypes.string,
      #   ...AnotherComponent.propTypes,
      # }
      composes: [ComponentComposes!]!

      # Component methods
      methods: [ComponentMethod]
    }
  `);
};

exports.createResolvers = ({ createResolvers }) => {
  createResolvers({
    ComponentProp: {
      required: {
        type: 'Boolean!',
        resolve: ({ required }) => required || false
      }
    },
    ComponentMetadata: {
      composes: {
        type: '[ComponentComposes!]!',
        resolve: ({ composes, parent }, args, context) => {
          if (!composes || !composes.length) return [];
          const file = context.nodeModel.getNodeById({
            id: parent,
            type: 'File'
          });

          const resolve = composes.map(c =>
            path.resolve(path.dirname(file.absolutePath), c)
          );

          const result = [];
          context.nodeModel
            .getAllNodes(
              { type: 'ComponentMetadata' },
              { path: context.path, connectionType: 'ComponentMetadata ' }
            )
            .forEach(node => {
              const idx = resolve.findIndex(
                p =>
                  node.absolutePath === p ||
                  withoutExtension(node.absolutePath) === p
              );

              if (idx !== -1) {
                result.push({ path: composes[idx], metadata: node });
              }
            });

          return result;
        }
      }
    }
  });
};

function canParse(node) {
  return (
    node &&
    (node.internal.mediaType === `application/javascript` ||
      // TypeScript doesn't really have a mime type and .ts files are a media file :/
      node.internal.mediaType === `application/typescript` ||
      node.internal.mediaType === `text/jsx` ||
      node.internal.mediaType === `text/tsx` ||
      node.extension === `tsx` ||
      node.extension === `ts`)
  );
}

function createDescriptionNode(
  node,
  entry,
  actions,
  createNodeId,
  createContentDigest
) {
  const { createNode } = actions;

  delete node.description;

  const descriptionNode = {
    id: createNodeId(descId(node.id)),
    parent: node.id,
    children: [],
    text: entry.description,
    internal: {
      type: `ComponentDescription`,
      mediaType: `text/markdown`,
      content: entry.description,
      contentDigest: createContentDigest(entry.description)
    }
  };

  node.description = descriptionNode.id;
  node.children = node.children.concat([descriptionNode.id]);
  createNode(descriptionNode);

  return node;
}

function createPropNodes(
  node,
  component,
  actions,
  createNodeId,
  createContentDigest
) {
  const { createNode } = actions;
  const children = new Array(component.props.length);

  component.props.forEach((prop, i) => {
    const propNodeId = propsId(node.id, prop.name);
    const content = JSON.stringify(prop);

    let propNode = {
      ...prop,
      id: createNodeId(propNodeId),
      children: [],
      parent: node.id,
      parentType: prop.type,
      internal: {
        type: `ComponentProp`,
        contentDigest: createContentDigest(content)
      }
    };
    children[i] = propNode.id;
    propNode = createDescriptionNode(
      propNode,
      prop,
      actions,
      createNodeId,
      createContentDigest
    );
    createNode(propNode);
  });

  node.props = children;
  node.children = node.children.concat(children);
  return node;
}

exports.onCreateNode = async (
  {
    node,
    loadNodeContent,
    actions,
    createNodeId,
    reporter,
    createContentDigest
  },
  pluginOptions
) => {
  const { createNode, createParentChildLink } = actions;

  if (!canParse(node)) return;

  const content = await loadNodeContent(node);

  let components;
  try {
    components = parseMetadata(content, node, pluginOptions);
  } catch (err) {
    reporter.error(
      `There was a problem parsing component metadata for file: "${node.relativePath}"`,
      err
    );
    return;
  }

  components.forEach(component => {
    const strContent = JSON.stringify(component);
    const contentDigest = createContentDigest(strContent);
    const nodeId = `${node.id}--${component.displayName}--ComponentMetadata`;

    let metadataNode = {
      ...component,
      props: null, // handled by the prop node creation
      id: createNodeId(nodeId),
      children: [],
      parent: node.id,
      absolutePath: node.absolutePath || null,
      internal: {
        contentDigest,
        type: `ComponentMetadata`
      }
    };

    createParentChildLink({ parent: node, child: metadataNode });
    metadataNode = createPropNodes(
      metadataNode,
      component,
      actions,
      createNodeId,
      createContentDigest
    );
    metadataNode = createDescriptionNode(
      metadataNode,
      component,
      actions,
      createNodeId,
      createContentDigest
    );
    createNode(metadataNode);
  });
};
