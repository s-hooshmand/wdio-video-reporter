/*
 * All externals have basic mocks in folder `./__mocks__`
 */

import * as fs from 'fs-extra';

import helpers from './helpers.js';
import config from './config.js';

describe('Helpers - ', () => {
  let logger = jest.fn();

  beforeEach(() => {
    helpers.setLogger(logger);
    config.debugMode = false;
    config.videoRenderTimeout = 5;

   helpers.sleep = jest.fn(() => {});
  });



  describe('debugLog - ', () => {
    const msg = 'A log line';

    beforeEach(() => {
      logger = jest.fn();
      helpers.setLogger(logger);
    });

    it('should write log if debugMode', () => {
      config.debugMode = true;

      helpers.debugLog(msg);
      expect(logger.mock.calls.length).toBe(1);
      expect(logger).toBeCalledWith(msg);
    });

    it('should not write log if not debugMode', () => {
      helpers.debugLog(msg);
      expect(logger.mock.calls.length).toBe(0);
    });
  });



  describe('generateFilename - ', () => {
    const name = 'DESCRIBE-TEST';
    const browser = 'BROWSER';
    const date = 'DATE-TIME';

    beforeEach(() => {
      global.Date = jest.fn(() => ({
        toLocaleString() {
          return date;
        },
      }));
    });

    it('should generate name in form: name--browser--date', () => {
      expect(helpers.generateFilename(browser, name)).toBe(`--${browser}--${date}`);
    });

    it('should replace space with -', () => {
      const testname = name + ' space';
      expect(helpers.generateFilename(browser, testname)).toBe(`--${browser}--${date}`);
    });

    it('should replace . with -', () => {
      const testname = name + '.dot';
      expect(helpers.generateFilename(browser, testname)).toBe(`--${browser}--${date}`);
    });

    it('should remove characters: /?<>\\/:*|"()[]<>%', () => {
      const testname = name + '-/?<>\\/:*|"()[]<>%comment/';
      expect(helpers.generateFilename(browser, testname)).toBe(`--${browser}--${date}`);
    });
  });




  describe('waitForVideos - ', () => {
    let videos = [
      'file1.mp4',
      'file2.mp4',
      'file3.mp4',
    ];

    describe('to exist - ', () => {
      beforeEach(() => {
        config.videoRenderTimeout = 5;

        let counter = 1;
        fs.default.existsSync = jest.fn(() => counter++ % 3 === 0);

        fs.default.statSync = jest.fn(() => ({
          size: 100,
        }));
      });

      it('should wait for videos to exist', () => {
        helpers.waitForVideos(videos);
        expect(helpers.sleep.mock.calls.length).toBe(3*videos.length + 2*(videos.length)); // wait for exist + 2*(wait for render)
      });

      it('should return a list of existing videos', () => {
        const existingVideos = helpers.waitForVideos(videos);
        expect(existingVideos).toEqual(videos);
      });

      it('should wait for videos to exist and bail if timeout is reached', () => {
        config.videoRenderTimeout = 0.2;
        const existingVideos = helpers.waitForVideos(videos);
        expect(helpers.sleep.mock.calls.length).toBe(videos.length + 2*(videos.length)); // wait for exist + 2*(wait for render)
        expect(existingVideos.length).toEqual(0);
      });

      it('should return a list of existing videos after bail', () => {
        let counter = 1;
        // Mock will not return true after first two files
        fs.default.existsSync = jest.fn(() => counter++ % 3 == 0 && counter < 9);

        const existingVideos = helpers.waitForVideos(videos);
        expect(existingVideos).toEqual(videos.slice(0,2));
      });
    });


    describe('to render - ', () => {
      beforeEach(() => {
        config.videoRenderTimeout = 5;

        fs.default.existsSync = jest.fn(() => true);

        let doneSize = false;
        let size = 45;
        const getSize = () => {
          size++;
          if (size > 50) {
            size = 50;
            if (!doneSize) {
              doneSize = true;
            } else {
              size = 46;
              doneSize = false;
            }
          }
          return size;
        };
        fs.default.statSync = jest.fn(() => ({
          size: getSize(),
        }));
      });

      it('should wait for videos to finish rendering', () => {
        helpers.waitForVideos(videos);
        expect(helpers.sleep.mock.calls.length).toBe(videos.length + 5*(videos.length)); // wait for exist + 3*(wait for render)
      });

      it('should wait for videos to finish rendering and bail if timeout is reached', () => {
        config.videoRenderTimeout = 0.2;
        const existingVideos = helpers.waitForVideos(videos);
        expect(helpers.sleep.mock.calls.length).toBe(videos.length + 3*(videos.length)); // wait for exist + 2*(wait for render)
        expect(existingVideos.length).toEqual(0);
      });

      it('should return a list of finished videos after bail because video did not finish in time', () => {
        // Mock will not stop increasing size after first two
        let counter = 1;
        let doneSize = false;
        let size = 45;
        const getSize = () => {
          size++;
          if (size > 50 && counter < 3) {
            size = 50;
            if (!doneSize) {
              doneSize = true;
            } else {
              size = 46;
              doneSize = false;
              counter ++;
            }
          }
          return size;
        };
        fs.default.statSync = jest.fn(() => ({
          size: getSize(),
        }));
        const existingVideos = helpers.waitForVideos(videos);
        expect(existingVideos).toEqual(videos.slice(0, 2));
      });

      it('should return a list of finished videos after bail because video did not render', () => {
        // Mock will not increasing size after first two
        let counter = 1;
        let doneSize = false;
        let size = 45;
        const getSize = () => {
          if (counter < 3) {
            size++;
          }

          if (size > 50) {
            size = 50;
            if (!doneSize) {
              doneSize = true;
            } else {
              size = 46;
              doneSize = false;
              counter ++;
            }
          }
          return size;
        };
        fs.default.statSync = jest.fn(() => ({
          size: getSize(),
        }));
        const existingVideos = helpers.waitForVideos(videos);
        expect(existingVideos).toEqual(videos.slice(0, 2));
      });
    });
  });
});
