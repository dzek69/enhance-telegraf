/* eslint-disable camelcase */

const { Interval } = require("oop-timers");

const noop = () => {}; // eslint-disable-line no-empty-function
const DEFAULT_UPDATE_TIME_SEC = 2;

const time2dots = (time) => {
    const dotsCount = (Math.floor(time / 1000) % 3) + 1; // eslint-disable-line no-magic-numbers
    return Array(dotsCount).fill(".").join("");
};

const createTextFunction = (fnOrString, appendDots) => {
    if (typeof fnOrString === "string") {
        if (appendDots) {
            return (time) => fnOrString + time2dots(time);
        }
        return () => fnOrString;
    }

    if (appendDots) {
        return (time) => fnOrString(time) + time2dots(time);
    }
    return fnOrString;
};

const createOptions = (options) => {
    if (typeof options === "string" || typeof options === "function") {
        return {
            fn: options,
        };
    }
    return options;
};

const enhanceBot = (telegraf) => { // eslint-disable-line max-lines-per-function
    // eslint-disable-next-line no-param-reassign, max-lines-per-function
    telegraf.context.sendAwaitingMessage = async function sendAwaitingMessage(options) {
        const useOptions = createOptions(options);
        const { telegram, update } = this;

        let startTime, isSending, currentFn;

        startTime = Date.now();
        isSending = false;

        let {
            fn,
            appendDots = false,
            updateEvery = DEFAULT_UPDATE_TIME_SEC,
        } = useOptions;

        currentFn = createTextFunction(fn, appendDots);

        const extra = {
            reply_to_message_id: update.message.message_id,
        };

        const sentMessage = await telegram.sendMessage(this.update.message.chat.id, currentFn(0), extra);
        const chatId = sentMessage.chat.id;
        const messageId = sentMessage.message_id;

        const updateNow = async () => {
            if (isSending) {
                return;
            }

            isSending = true;
            const newText = currentFn(Date.now() - startTime);
            await telegram.editMessageText(chatId, messageId, null, newText).catch(noop);
            isSending = false;
        };

        // eslint-disable-next-line no-magic-numbers
        const interval = new Interval(updateNow, updateEvery * 1000, true, false);

        return {
            done: () => {
                interval.stop();
                telegram.deleteMessage(chatId, messageId);
            },
            updateOptions: (updatedOptions, resetTime = false, triggerUpdate = true) => {
                const newOptions = createOptions(updatedOptions);
                if ("fn" in newOptions) {
                    fn = newOptions.fn;
                }
                if ("appendDots" in newOptions) {
                    appendDots = newOptions.appendDots;
                }
                if ("updateEvery" in newOptions) {
                    updateEvery = newOptions.updateEvery;
                }
                currentFn = createTextFunction(fn, appendDots);
                if (resetTime) {
                    startTime = Date.now();
                }
                if (triggerUpdate) {
                    updateNow().catch(noop);
                }
            },
            sentMessage: sentMessage,
        };
    };
};

export default enhanceBot;
