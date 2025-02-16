import type { RefObject } from 'react';
import { getActions } from '../../../global';

import type { MessageListType } from '../../../global/types';

import { IS_ANDROID } from '../../../util/windowEnvironment';
import { useIntersectionObserver } from '../../../hooks/useIntersectionObserver';
import useBackgroundMode from '../../../hooks/useBackgroundMode';
import useAppLayout from '../../../hooks/useAppLayout';

const INTERSECTION_THROTTLE_FOR_READING = 150;
const INTERSECTION_THROTTLE_FOR_MEDIA = IS_ANDROID ? 1000 : 350;

export default function useMessageObservers(
  type: MessageListType,
  containerRef: RefObject<HTMLDivElement>,
  memoFirstUnreadIdRef: { current: number | undefined },
) {
  const { markMessageListRead, markMentionsRead, animateUnreadReaction } = getActions();

  const { isMobile } = useAppLayout();
  const INTERSECTION_MARGIN_FOR_LOADING = isMobile ? 300 : 500;

  const {
    observe: observeIntersectionForReading, freeze: freezeForReading, unfreeze: unfreezeForReading,
  } = useIntersectionObserver({
    rootRef: containerRef,
    throttleMs: INTERSECTION_THROTTLE_FOR_READING,
  }, (entries) => {
    if (type !== 'thread') {
      return;
    }

    let maxId = 0;
    const mentionIds: number[] = [];
    const reactionIds: number[] = [];

    entries.forEach((entry) => {
      const { isIntersecting, target } = entry;

      if (!isIntersecting) {
        return;
      }

      const { dataset } = target as HTMLDivElement;

      const messageId = Number(dataset.lastMessageId || dataset.messageId);
      if (messageId > maxId) {
        maxId = messageId;
      }

      if (dataset.hasUnreadMention) {
        mentionIds.push(messageId);
      }

      if (dataset.hasUnreadReaction) {
        reactionIds.push(messageId);
      }
    });

    if (memoFirstUnreadIdRef.current && maxId >= memoFirstUnreadIdRef.current) {
      markMessageListRead({ maxId });
    }

    if (mentionIds.length) {
      markMentionsRead({ messageIds: mentionIds });
    }

    if (reactionIds.length) {
      animateUnreadReaction({ messageIds: reactionIds });
    }
  });

  useBackgroundMode(freezeForReading, unfreezeForReading);

  const {
    observe: observeIntersectionForLoading,
  } = useIntersectionObserver({
    rootRef: containerRef,
    throttleMs: INTERSECTION_THROTTLE_FOR_MEDIA,
    margin: INTERSECTION_MARGIN_FOR_LOADING,
  });

  const { observe: observeIntersectionForPlaying } = useIntersectionObserver({
    rootRef: containerRef,
    throttleMs: INTERSECTION_THROTTLE_FOR_MEDIA,
  });

  return {
    observeIntersectionForReading,
    observeIntersectionForLoading,
    observeIntersectionForPlaying,
  };
}
