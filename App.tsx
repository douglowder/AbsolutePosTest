import React, { useCallback } from 'react';
import {
  Dimensions,
  TVFocusGuideView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const { height, width } = Dimensions.get('window');

const designResolution = { width: 1920, height: 1080 };

const scale =
  Math.sqrt(height * height + width * width) /
  Math.sqrt(
    designResolution.height * designResolution.height +
      designResolution.width * designResolution.width,
  );

const px = (size: number) => Math.round(scale * size);

const startTime = new Date(
  Math.floor(1709115979 / 60 / 60) * 60 * 60 * 1000,
).getTime();
const currentTime = new Date(
  Math.floor(1709115979 / 60 / 60) * 60 * 60 * 1000,
).getTime();

// Make random duration between 15 and 120 minutes, in intervals of 5 minutes
const minDuration = 25;
const maxDuration = 120;
const randomDuration = () => {
  const randomMinutes = Math.max(
    minDuration,
    Math.floor(Math.random() * maxDuration),
  );

  // Round to nearest 5 minutes
  return Math.round(randomMinutes / 5) * 5 * 60 * 1000;
};

const guideData = Array.from({ length: 10 }).map((_, channelNumber) => ({
  title: `Channel ${channelNumber + 1}`,
  programs: Array.from({ length: 5 })
    .fill(0)
    .reduce(
      (
        currentValue: {
          id: number;
          title: string;
          start: number;
          end: number;
        }[],
      ) => {
        const index = currentValue.length + 1;
        const start = currentValue[currentValue.length - 1]
          ? currentValue[currentValue.length - 1].end
          : new Date(currentTime + randomDuration()).getTime();

        currentValue.push({
          id: index,
          title: `Program ${index}`,
          start,
          end: new Date(start + randomDuration()).getTime(),
        });

        return currentValue;
      },
      [],
    ),
}));

const MINUTE_WIDTH = px(5);
const CHANNEL_HEIGHT = px(100);
const CHANNEL_SPACING = px(5);

const GuideScreen = () => {
  const viewportHeight = useSharedValue(600);
  const viewportWidth = useSharedValue(600);
  const channelsInView = useSharedValue([0, 0]);

  const focusedChannel = useSharedValue(0);
  const focusedProgramStart = useSharedValue(null);
  const focusedProgramEnd = useSharedValue(null);

  const handleLayoutContainer = useCallback(
    ({ nativeEvent }) => {
      viewportHeight.value = nativeEvent.layout.height;
      viewportWidth.value = nativeEvent.layout.width;

      channelsInView.value = [
        0,
        Math.ceil(viewportHeight.value / (CHANNEL_HEIGHT + CHANNEL_SPACING)) +
          1,
      ];
    },
    [channelsInView, viewportHeight, viewportWidth],
  );

  const handleFocus = useCallback(
    ({ channelIndex, start, end }) => {
      // focusedChannel.value = channelIndex;
      // focusedProgramStart.value = start;
      // focusedProgramEnd.value = end;

      const channelInView =
        Math.ceil(viewportHeight.value / (CHANNEL_HEIGHT + CHANNEL_SPACING)) +
        1;

      channelsInView.value = [
        Math.ceil(channelIndex - channelInView / 2),
        Math.max(channelInView, Math.ceil(channelIndex + channelInView / 2)),
      ];

      focusedChannel.value = withTiming(channelIndex, {
        duration: 250,
      });
      focusedProgramStart.value = withTiming(start, {
        duration: 250,
      });
      focusedProgramEnd.value = withTiming(end, {
        duration: 250,
      });
    },
    [
      viewportHeight.value,
      channelsInView,
      focusedChannel,
      focusedProgramStart,
      focusedProgramEnd,
    ],
  );

  const viewportStyle = useAnimatedStyle(() => {
    const transform: any = [
      {
        // Center channel row in viewport
        translateY: Math.max(
          viewportHeight.value -
            guideData.length * (CHANNEL_HEIGHT + CHANNEL_SPACING),
          Math.min(
            0,
            -focusedChannel.value * (CHANNEL_HEIGHT + CHANNEL_SPACING) +
              viewportHeight.value / 2 -
              CHANNEL_HEIGHT / 2,
          ),
        ),
      },
    ];

    if (focusedProgramStart.value && focusedProgramEnd.value) {
      const start = focusedProgramStart.value;
      const end = focusedProgramEnd.value;

      transform.push({
        // Center program in viewport
        translateX:
          viewportWidth.value / 2 -
          (((start - startTime) / 1000 / 60) * MINUTE_WIDTH +
            ((end - start) / 1000 / 60 / 2) * MINUTE_WIDTH),
      });
    }

    return {
      transform,
    };
  }, [
    focusedChannel,
    viewportHeight,
    viewportWidth,
    focusedProgramStart,
    focusedProgramEnd,
  ]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,100,1)',
      }}
    >
      <View
        style={{
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,1)',
        }}
        onLayout={handleLayoutContainer}
      >
        <TVFocusGuideView
          style={{
            width: '100%',
            height: '100%',
          }}
          trapFocusDown={true}
          trapFocusLeft={true}
          trapFocusRight={true}
          trapFocusUp={true}
        >
          <Animated.View style={[{}, viewportStyle]}>
            {guideData.map((channel, index) => {
              return (
                <ChannelRow
                  key={channel.title}
                  channel={channel}
                  channelsInView={channelsInView}
                  index={index}
                  onFocus={handleFocus}
                />
              );
            })}
          </Animated.View>
        </TVFocusGuideView>
      </View>
    </View>
  );
};

export default GuideScreen;

const ChannelRow = ({
  channel,
  index,
  style,
  channelsInView,
  onFocus,
}: {
  channel: any;
  index: number;
  style?: any;
  channelsInView: any;
  onFocus: ({ channelIndex, start, end }) => void;
}) => {
  const visibleStyle = useAnimatedStyle(() => {
    const [min, max] = channelsInView.value;

    return {
      opacity: index >= min && index <= max ? 1 : 0.2,
    };
  }, [channelsInView, index]);

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          height: CHANNEL_HEIGHT,
          margin: 5,
        },
        style,
        visibleStyle,
      ]}
    >
      {/*<View*/}
      {/*  style={{*/}
      {/*    width: px(200),*/}
      {/*    justifyContent: 'center',*/}
      {/*    backgroundColor: 'rgba(255,255,255,.1)',*/}
      {/*  }}*/}
      {/*>*/}
      {/*  <CaptionText>{channel.title}</CaptionText>*/}
      {/*</View>*/}

      {channel.programs.map((program) => {
        return (
          <ProgramCell
            key={program.id}
            {...program}
            channelIndex={index}
            onFocus={onFocus}
          />
        );
      })}
    </Animated.View>
  );
};

const ProgramCell = ({ start, end, title, onFocus, channelIndex }) => {
  const focused = useSharedValue(false);

  const handleFocus = useCallback(() => {
    focused.value = true;
    onFocus?.({ channelIndex, start, end });
  }, [channelIndex, end, focused, onFocus, start]);

  const handleBlur = useCallback(() => {
    focused.value = false;
  }, [focused]);

  const backgroundColor = useAnimatedStyle(() => {
    return {
      borderColor: focused.value
        ? 'rgba(255,255,255,1)'
        : 'rgba(255,255,255,0)',
    };
  }, [focused]);

  return (
    <View
      style={{
        width: ((end - start) / 1000 / 60) * MINUTE_WIDTH,
        paddingHorizontal: CHANNEL_SPACING / 2,
        height: CHANNEL_HEIGHT,
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={{ flex: 1 }}
        onBlur={handleBlur}
        onFocus={handleFocus}
      >
        <Animated.View
          style={[
            {
              flex: 1,
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,.1)',
              borderWidth: 2,
            },
            backgroundColor,
          ]}
        >
          <Text style={{ color: 'white' }}>{title}</Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};
