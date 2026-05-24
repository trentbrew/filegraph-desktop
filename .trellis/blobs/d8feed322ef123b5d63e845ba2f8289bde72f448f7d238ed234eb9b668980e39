/**
 * MentionWithPreview Extension for TipTap
 * 
 * Extends the default Mention extension to use a React NodeView
 * that includes HoverCard previews for entity references.
 */

import Mention from '@tiptap/extension-mention'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { MentionNodeView } from './MentionNodeView'

export const MentionWithPreview = Mention.extend({
  name: 'mention',

  addNodeView() {
    return ReactNodeViewRenderer(MentionNodeView)
  },
})

export default MentionWithPreview
