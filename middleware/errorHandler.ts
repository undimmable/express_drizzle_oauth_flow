import {ParamsDictionary} from "express-serve-static-core";
import {NextFunction, Request, Response} from "express";

const errorHandler = (err: ParamsDictionary, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({"error": err.message});
    next(err);
};

export default errorHandler;