export const RcpLogServiceName = 'qsk';

// イベント名は適宜追加してください
// e.g.
//   export type RcpLogEventName = 'pageTransition' | 'buttonClick' | ...;
export type RcpLogEventName = 'pageTransition';

export type RcpLogBody = RcpLogPageTransitionBody;

export interface RcpLogPageTransitionBody {
  pageName: string;
}
