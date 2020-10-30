import React from "react";
import {
  calcTimeDelta,
  CountdownTimeDelta,
  CountdownTimeDeltaFormatOptions,
  CountdownTimeDeltaFormatted,
  formatTimeDelta,
  timeDeltaFormatOptionsDefaults,
} from "./utils";

const enum CountdownStatus {
  STARTED = "STARTED",
  PAUSED = "PAUSED",
  STOPPED = "STOPPED",
  COMPLETED = "COMPLETED",
}

export interface CountdownApi {
  readonly start: () => void;
  readonly pause: () => void;
  readonly stop: () => void;
  readonly isStarted: () => boolean;
  readonly isPaused: () => boolean;
  readonly isStopped: () => boolean;
  readonly isCompleted: () => boolean;
}

export interface CountdownProps
  extends React.Props<Countdown>,
    CountdownTimeDeltaFormatOptions {
  readonly date?: Date | number | string;
  readonly controlled?: boolean;
  readonly intervalDelay?: number;
  readonly precision?: number;
  readonly autoStart?: boolean;
  readonly overtime?: boolean;
  readonly className?: string;
  readonly children?: React.ReactElement<any>;
  readonly renderer?: CountdownRendererFn;
  readonly now?: () => number;
  readonly onMount?: CountdownTimeDeltaFn;
  readonly onStart?: CountdownTimeDeltaFn;
  readonly onPause?: CountdownTimeDeltaFn;
  readonly onStop?: CountdownTimeDeltaFn;
  readonly onTick?: CountdownTimeDelta;
  readonly onComplete?: CountdownTimeDeltaFn;
}

export interface CountdownRenderProps extends CountdownTimeDelta {
  readonly api: CountdownApi;
  readonly props: CountdownProps;
  readonly formatted: CountdownTimeDeltaFormatted;
}

export type CountdownRendererFn = (
  props: CountdownRenderProps
) => React.ReactNode;

export type CountdownTimeDeltaFn = (timeDelta: CountdownTimeDelta) => void;

interface CountdownState {
  readonly timeDelta: CountdownTimeDelta;
  readonly status: CountdownStatus;
}

export interface CountdownRenderProps extends CountdownTimeDelta {
  readonly api: CountdownApi;
  readonly props: CountdownProps;
  readonly formatted: CountdownTimeDeltaFormatted;
}

export default class Countdown extends React.Component<
  CountdownProps,
  CountdownState
> {
  api: CountdownApi | undefined;

  static defaultProps: Partial<CountdownProps> = {
    ...timeDeltaFormatOptionsDefaults,
    controlled: false,
    intervalDelay: 1000,
    precision: 0,
    autoStart: true,
  };

  initialTimestamp = this.calcOffsetStartTimestamp();
  interval: number | undefined;
  mounted = false;
  offsetStartTimestamp = this.props.autoStart ? 0 : this.initialTimestamp;
  offsetTime = 0;

  constructor(props: CountdownProps) {
    super(props);

    const timeDelta = this.calcTimeDelta();
    this.state = {
      timeDelta,
      status: timeDelta.completed
        ? CountdownStatus.COMPLETED
        : CountdownStatus.STOPPED,
    };
  }

  calcOffsetStartTimestamp(): number {
    return Date.now();
  }

  calcTimeDelta(): CountdownTimeDelta {
    const { date, now, precision, controlled, overtime } = this.props;

    return calcTimeDelta(date!, {
      now,
      precision,
      controlled,
      offsetTime: this.offsetTime,
      overtime,
    });
  }

  clearTimer(): void {
    window.clearInterval(this.interval);
  }

  componentDidMount(): void {
    this.mounted = true;

    if (this.props.onMount) this.props.onMount(this.calcTimeDelta());
    if (this.props.autoStart) this.start();
  }

  componentDidUpdate(prevProps: CountdownProps): void {
    if (!this.shallowCompare(this.props, prevProps)) {
      if (this.props.date !== prevProps.date) {
        this.initialTimestamp = this.calcOffsetStartTimestamp();
        this.offsetStartTimestamp = this.initialTimestamp;
        this.offsetTime = 0;
      }

      this.setTimeDeltaState(this.calcTimeDelta());
    }
  }

  componentWillUnmount(): void {
    this.mounted = false;
    this.clearTimer();
  }

  getApi(): CountdownApi {
    return (this.api = this.api || {
      start: this.start,
      pause: this.pause,
      stop: this.stop,
      isStarted: this.isStarted,
      isPaused: this.isPaused,
      isStopped: this.isStopped,
      isCompleted: this.isCompleted,
    });
  }

  getRenderProps(): CountdownRenderProps {
    const { daysInHours, zeroPadTime, zeroPadDays } = this.props;
    const { timeDelta } = this.state;

    return {
      ...timeDelta,
      api: this.getApi(),
      props: this.props,
      formatted: formatTimeDelta(timeDelta, {
        daysInHours,
        zeroPadTime,
        zeroPadDays,
      }),
    };
  }

  handleOnComplete = (timeDelta: CountdownTimeDelta): void => {
    if (this.props.onComplete) this.props.onComplete(timeDelta);
  };

  isCompleted = (): boolean => {
    return this.isStatus(CountdownStatus.COMPLETED);
  };

  isPaused = (): boolean => {
    return this.isStatus(CountdownStatus.PAUSED);
  };

  isStarted = (): boolean => {
    return this.isStatus(CountdownStatus.STARTED);
  };

  isStatus(status: CountdownStatus): boolean {
    return this.state.status === status;
  }

  isStopped = (): boolean => {
    return this.isStatus(CountdownStatus.STOPPED);
  };

  pause = (): void => {
    if (this.isPaused()) return;

    this.clearTimer();
    this.offsetStartTimestamp = this.calcOffsetStartTimestamp();
    this.setTimeDeltaState(
      this.state.timeDelta,
      CountdownStatus.PAUSED,
      this.props.onPause
    );
  };

  render(): React.ReactNode {
    // if (this.legacy) {}
    const { className, overtime, children, renderer } = this.props;
    const renderProps = this.getRenderProps();

    if (renderer) {
      return renderer(renderProps);
    }

    if (children && this.state.timeDelta.completed && !overtime) {
      return React.cloneElement(children, { countdown: renderProps });
    }

    const { days, hours, minutes, seconds } = renderProps.formatted;
    return (
      <span className={className}>
        {renderProps.total < 0 ? "-" : ""}
        {days}
        {days ? ":" : ""}
        {hours}:{minutes}:{seconds}
      </span>
    );
  }

  setTimeDeltaState(
    timeDelta: CountdownTimeDelta,
    status?: CountdownStatus,
    callback?: (timeDelta: CountdownTimeDelta) => void
  ): void {
    if (!this.mounted) return;

    let completedCallback: this["handleOnComplete"] | undefined;

    if (!this.state.timeDelta.completed && timeDelta.completed) {
      if (!this.props.overtime) this.clearTimer();

      completedCallback = this.handleOnComplete;
    }

    const onDone = () => {
      if (callback) callback(this.state.timeDelta);

      if (completedCallback) completedCallback(this.state.timeDelta);
    };

    return this.setState((prevState) => {
      let newStatus = status || prevState.status;

      if (timeDelta.completed && !this.props.overtime) {
        newStatus = CountdownStatus.COMPLETED;
      } else if (!status && newStatus === CountdownStatus.COMPLETED) {
        newStatus = CountdownStatus.STOPPED;
      }

      return {
        timeDelta,
        status: newStatus,
      };
    }, onDone);
  }

  shallowCompare(objA: object, objB: object): boolean {
    const keysA = Object.keys(objA);

    return (
      keysA.length === Object.keys(objB).length &&
      !keysA.some((keyA) => {
        const valueA = objA[keyA];
        const valueB = objB[keyA];

        return (
          !objB.hasOwnProperty(keyA) ||
          !(valueA === valueB || (valueA !== valueA && valueB !== valueB))
        );
      })
    );
  }

  start = (): void => {
    if (this.isStarted()) return;

    const prevOffsetStartTimestamp = this.offsetStartTimestamp;
    this.offsetStartTimestamp = 0;
    this.offsetTime += prevOffsetStartTimestamp
      ? this.calcOffsetStartTimestamp() - prevOffsetStartTimestamp
      : 0;

    const timeDelta = this.calcTimeDelta();
    this.setTimeDeltaState(
      timeDelta,
      CountdownStatus.STARTED,
      this.props.onStart
    );

    if (
      !this.props.controlled &&
      (!timeDelta.completed || this.props.overtime)
    ) {
      this.clearTimer();
      this.interval = window.setInterval(this.tick, this.props.intervalDelay);
    }
  };

  stop = (): void => {
    if (this.isStopped()) return;

    this.clearTimer();
    this.offsetStartTimestamp = this.calcOffsetStartTimestamp();
    this.offsetTime = this.offsetStartTimestamp - this.initialTimestamp;
    this.setTimeDeltaState(
      this.calcTimeDelta(),
      CountdownStatus.STOPPED,
      this.props.onStop
    );
  };

  tick = (): void => {
    const timeDelta = this.calcTimeDelta();
    const callback = timeDelta.completed ? undefined : this.props.onTick;
    this.setTimeDeltaState(timeDelta, undefined, callback);
  };
}
