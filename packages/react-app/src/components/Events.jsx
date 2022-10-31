/* eslint-disable prettier/prettier */
import { List } from "antd";
import { useEventListener } from "eth-hooks/events/useEventListener";
import { Address, TokenBalance } from "../components";

/*
  ~ What it does? ~

  Displays a lists of events

  ~ How can I use? ~

  <Events
    contracts={readContracts}
    contractName="YourContract"
    eventName="SetPurpose"
    localProvider={localProvider}
    mainnetProvider={mainnetProvider}
    startBlock={1}
  />
*/

export default function Events({ contracts, contractName, eventName, localProvider, mainnetProvider, startBlock }) {
  // 📟 Listen for broadcast events
  const events = useEventListener(contracts, contractName, eventName, localProvider, startBlock);
  events.sort((a, b) => b.blockNumber - a.blockNumber);

  return (
    <div style={{ width: 600, margin: "auto", marginTop: 32, paddingBottom: 32 }}>
      <h2>
        {eventName} Events
        <br />
        {eventName === "EthToTokenSwap"
          ? " ⟠ -->🎈 Address | Trade | AmountIn | AmountOut"
          : eventName === "TokenToEthSwap"
          ? "🎈-->⟠ Address | Trade | AmountOut | AmountIn"
          : eventName === "LiquidityProvided"
          ? "➕ Address | Liquidity Minted | Eth In | Balloons In"
          : eventName === "LiquidityRemoved"
          ? "➖ Address | Liquidity Withdrawn | ETH out | Balloons Out "
          : eventName === "Approval"
          ? " 📝 Address Owner | Address Spender | Value" 
          : ""}
      </h2>
      <List
        bordered
        dataSource={events}
        renderItem={item => {
          if (!item || !item.args || item.args.length === 0) {
            return (
              <List.Item key={item.blockNumber + "_"}>
                Event without arguments
              </List.Item>
            );
          }
          if (eventName === "Approval") {
            return (
              <List.Item key={item.blockNumber + "_" + item.args[0].toString()}> 
                <Address address={item.args[0]} ensProvider={mainnetProvider} fontSize={16} />
                <Address address={item.args[1]} ensProvider={mainnetProvider} fontSize={16} />
                <TokenBalance balance={item.args[2]} provider={localProvider} />
              </List.Item>
            );
          } else {
          return (
            <List.Item key={item.blockNumber + "_" + item.args[0].toString()}> 
              <Address address={item.args[0]} ensProvider={mainnetProvider} fontSize={16} />
              {item.args[1].toString().indexOf("E") == -1 ? (
                <TokenBalance balance={item.args[1]} provider={localProvider} />
              ) : (
                `${item.args[1].toString()}`
              )}
              <TokenBalance balance={item.args[2]} provider={localProvider} />
              <TokenBalance balance={item.args[3]} provider={localProvider} />
            </List.Item>
          );
        }}}
      />
    </div>
  );
}
